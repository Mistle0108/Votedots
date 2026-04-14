import { Server } from "socket.io";
import { In } from "typeorm";
import {
  getCanvasGameConfigSnapshot,
  type GameConfigSnapshot,
} from "../../config/game.config";
import { redisClient } from "../../config/redis";
import { AppDataSource } from "../../database/data-source";
import { Canvas } from "../../entities/canvas.entity";
import { Cell, CellStatus } from "../../entities/cell.entity";
import { VoteRound } from "../../entities/vote-round.entity";
import { VoteTicket } from "../../entities/vote-ticket.entity";
import { Vote } from "../../entities/vote.entity";
import { Voter } from "../../entities/voter.entity";
import { GamePhase } from "../game/game-phase.types";
import { participantSessionService } from "../participant/participant-session.service";
import { summaryService } from "../summary/summary.service"; // 추가: 라운드 summary 저장 서비스
import { voteService } from "../vote/vote.service";

const canvasRepository = AppDataSource.getRepository(Canvas);
const cellRepository = AppDataSource.getRepository(Cell);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);
const voteTicketRepository = AppDataSource.getRepository(VoteTicket);
const voteRepository = AppDataSource.getRepository(Vote);
const voterRepository = AppDataSource.getRepository(Voter);

const VOTE_TICKET_INSERT_CHUNK_SIZE = 1000;

interface RoundStateResponse {
  status: "active" | "waiting";
  round: {
    id: number;
    roundNumber: number;
    startedAt: Date;
    endedAt: Date | null;
    roundDurationSec: number;
    totalRounds: number;
    gameEndAt: string;
  };
  timer: {
    remainingSeconds: number;
    isRoundExpired: boolean;
    roundDurationSec: number;
    totalRounds: number;
    gameEndAt: string;
  };
}

interface ResolvedRoundCell {
  cellId: number;
  color: string;
  totalVotes: number;
  topColorVoteCount: number;
  wasColorTie: boolean;
}

function logPhaseChange(params: {
  canvasId: number;
  phase: GamePhase;
  roundNumber: number;
  phaseStartedAt: Date;
  phaseEndsAt: Date | null;
  reason: string;
}): void {
  const { canvasId, phase, roundNumber, phaseStartedAt, phaseEndsAt, reason } =
    params;

  console.log(
    `[phase] ${reason} | 캔버스=${canvasId} 단계=${phase} 라운드=${roundNumber} 시작=${phaseStartedAt.toISOString()} 종료=${phaseEndsAt?.toISOString() ?? "null"}`,
  );
}

function getActiveGameEndAt(
  config: GameConfigSnapshot,
  roundStartedAt: Date,
  roundNumber: number,
): Date {
  const remainingRoundsIncludingCurrent =
    config.rules.totalRounds - roundNumber + 1;

  return new Date(
    roundStartedAt.getTime() +
    remainingRoundsIncludingCurrent * config.phases.roundDurationSec * 1000 +
    Math.max(0, remainingRoundsIncludingCurrent - 1) *
    config.phases.roundResultDelaySec *
    1000,
  );
}

function getWaitingGameEndAt(
  config: GameConfigSnapshot,
  roundEndedAt: Date,
  roundNumber: number,
): Date {
  const futureRounds = config.rules.totalRounds - roundNumber;

  return new Date(
    roundEndedAt.getTime() +
    config.phases.roundResultDelaySec * 1000 +
    futureRounds * config.phases.roundDurationSec * 1000 +
    Math.max(0, futureRounds - 1) * config.phases.roundResultDelaySec * 1000,
  );
}

export const roundService = {
  async startRound(canvasId: number, io?: Server): Promise<VoteRound> {
    const canvas = await canvasRepository.findOne({ where: { id: canvasId } });

    if (!canvas) {
      throw new Error("Canvas was not found.");
    }

    const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);

    const activeRound = await voteRoundRepository.findOne({
      where: { canvas: { id: canvasId }, isActive: true },
    });

    if (activeRound) {
      throw new Error("An active round is already in progress.");
    }

    const lastRound = await voteRoundRepository.findOne({
      where: { canvas: { id: canvasId } },
      order: { roundNumber: "DESC" },
    });

    const nextRoundNumber = lastRound ? lastRound.roundNumber + 1 : 1;
    const roundStartedAt = new Date();
    const roundEndsAt = new Date(
      roundStartedAt.getTime() +
      canvasGameConfig.phases.roundDurationSec * 1000,
    );

    const round = voteRoundRepository.create({
      canvas,
      roundNumber: nextRoundNumber,
      startedAt: roundStartedAt,
      isActive: true,
    });

    await voteRoundRepository.save(round);

    await canvasRepository.update(canvasId, {
      phase: GamePhase.ROUND_ACTIVE,
      phaseStartedAt: roundStartedAt,
      phaseEndsAt: roundEndsAt,
      currentRoundNumber: nextRoundNumber,
    });

    logPhaseChange({
      canvasId,
      phase: GamePhase.ROUND_ACTIVE,
      roundNumber: nextRoundNumber,
      phaseStartedAt: roundStartedAt,
      phaseEndsAt: roundEndsAt,
      reason: "라운드 시작",
    });

    const { voterIds } =
      await participantSessionService.activateParticipantsForRound(canvasId);

    const voters =
      voterIds.length > 0
        ? await voterRepository.findBy({ id: In(voterIds) })
        : [];

    const tickets: Array<{
      round: { id: number };
      voter: { id: number };
      isUsed: boolean;
    }> = [];

    for (const voter of voters) {
      for (let i = 0; i < canvasGameConfig.rules.votesPerRound; i++) {
        tickets.push({
          round: { id: round.id },
          voter: { id: voter.id },
          isUsed: false,
        });
      }
    }

    const ticketInsertStartedAt = performance.now();

    for (
      let index = 0;
      index < tickets.length;
      index += VOTE_TICKET_INSERT_CHUNK_SIZE
    ) {
      const chunk = tickets.slice(index, index + VOTE_TICKET_INSERT_CHUNK_SIZE);
      await voteTicketRepository.insert(chunk);
    }

    console.log(
      `[perf] vote tickets insert | roundId=${round.id} voterCount=${voters.length} ticketCount=${tickets.length} ms=${(performance.now() - ticketInsertStartedAt).toFixed(2)}`,
    );

    await voteService.registerIssuedVoters(
      round.id,
      voters.map((voter) => voter.id),
    );

    if (io) {
      const gameEndAt = getActiveGameEndAt(
        canvasGameConfig,
        round.startedAt,
        round.roundNumber,
      );

      io.to(`canvas:${canvasId}`).emit("round:started", {
        roundId: round.id,
        roundNumber: round.roundNumber,
        startedAt: round.startedAt,
        roundDurationSec: canvasGameConfig.phases.roundDurationSec,
        totalRounds: canvasGameConfig.rules.totalRounds,
        gameEndAt: gameEndAt.toISOString(),
      });
    }

    return round;
  },

  async endRound(
    canvasId: number,
    roundId: number,
    io?: Server,
  ): Promise<VoteRound> {
    const canvas = await canvasRepository.findOne({ where: { id: canvasId } });

    if (!canvas) {
      throw new Error("Canvas was not found.");
    }

    const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);

    const round = await voteRoundRepository.findOne({
      where: { id: roundId, canvas: { id: canvasId }, isActive: true },
    });

    if (!round) {
      throw new Error("No active round was found.");
    }

    const redisKey = `vote:round:${roundId}`;
    const voteData = await redisClient.hGetAll(redisKey);

    const voteBuckets = new Map<number, Map<string, number>>();

    const addVoteBucket = (cellId: number, color: string, count: number) => {
      const colorBuckets = voteBuckets.get(cellId) ?? new Map<string, number>();

      colorBuckets.set(color, (colorBuckets.get(color) ?? 0) + count);
      voteBuckets.set(cellId, colorBuckets);
    };

    for (const [key, value] of Object.entries(voteData)) {
      const [cellIdValue, color] = key.split(":");
      const cellId = parseInt(cellIdValue, 10);
      const count = parseInt(value, 10);

      if (
        !Number.isFinite(cellId) ||
        !color ||
        !Number.isFinite(count) ||
        count <= 0
      ) {
        continue;
      }

      addVoteBucket(cellId, color, count);
    }

    if (voteBuckets.size === 0) {
      const votes = await voteRepository.find({
        where: { round: { id: roundId } },
        relations: ["cell"],
      });

      for (const vote of votes) {
        addVoteBucket(vote.cell.id, vote.color, 1);
      }
    }

    const resolvedCells: ResolvedRoundCell[] = [];

    for (const [cellId, colorBuckets] of voteBuckets.entries()) {
      let totalVotes = 0;
      let maxColorVotes = 0;
      const topColors: string[] = [];

      for (const [color, count] of colorBuckets.entries()) {
        totalVotes += count;

        if (count > maxColorVotes) {
          maxColorVotes = count;
          topColors.length = 0;
          topColors.push(color);
          continue;
        }

        if (count === maxColorVotes) {
          topColors.push(color);
        }
      }

      if (topColors.length === 0) {
        continue;
      }

      const selectedColor =
        topColors[Math.floor(Math.random() * topColors.length)];

      resolvedCells.push({
        cellId,
        color: selectedColor,
        totalVotes,
        topColorVoteCount: maxColorVotes,
        wasColorTie: topColors.length > 1,
      });
    }

    let updatedCells: Cell[] = [];

    if (resolvedCells.length > 0) {
      const cellsToUpdate = await cellRepository.findBy({
        id: In(resolvedCells.map((cell) => cell.cellId)),
      });

      const resolvedCellMap = new Map(
        resolvedCells.map((cell) => [cell.cellId, cell]),
      );

      for (const cell of cellsToUpdate) {
        const resolvedCell = resolvedCellMap.get(cell.id);

        if (!resolvedCell) {
          continue;
        }

        cell.color = resolvedCell.color;
        cell.status = CellStatus.PAINTED;
      }

      if (cellsToUpdate.length > 0) {
        updatedCells = await cellRepository.save(cellsToUpdate);
      }
    }

    round.isActive = false;
    round.endedAt = new Date();
    await voteRoundRepository.save(round);

    const roundResultEndsAt = new Date(
      round.endedAt.getTime() +
      canvasGameConfig.phases.roundResultDelaySec * 1000,
    );

    await canvasRepository.update(canvasId, {
      phase: GamePhase.ROUND_RESULT,
      phaseStartedAt: round.endedAt,
      phaseEndsAt: roundResultEndsAt,
      currentRoundNumber: round.roundNumber,
    });

    logPhaseChange({
      canvasId,
      phase: GamePhase.ROUND_RESULT,
      roundNumber: round.roundNumber,
      phaseStartedAt: round.endedAt,
      phaseEndsAt: roundResultEndsAt,
      reason: "라운드 결과 전환",
    });

    const roundSummary = await summaryService.saveRoundSummary(canvasId, round.id);

    await redisClient.del(redisKey);
    await voteService.clearIssuedVoters(round.id);

    if (io) {
      io.to(`canvas:${canvasId}`).emit("round:ended", {
        roundId: round.id,
        roundNumber: round.roundNumber,
        endedAt: round.endedAt,
      });

      io.to(`canvas:${canvasId}`).emit("canvas:batch-updated", {
        updates: updatedCells.map((cell) => ({
          cellId: cell.id,
          x: cell.x,
          y: cell.y,
          color: cell.color ?? "#000000",
        })),
      });

      io.to(`canvas:${canvasId}`).emit("round-summary:ready", {
        canvasId,
        roundId: round.id,
        roundNumber: round.roundNumber,
        summaryId: roundSummary.id,
      });
    }

    return round;
  },

  async getActiveRoundState(
    canvasId: number,
  ): Promise<RoundStateResponse | null> {
    const canvas = await canvasRepository.findOne({ where: { id: canvasId } });

    if (!canvas) {
      return null;
    }

    const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);
    const now = new Date();

    const activeRound = await voteRoundRepository.findOne({
      where: { canvas: { id: canvasId }, isActive: true },
      order: { roundNumber: "DESC" },
    });

    if (activeRound) {
      const remainingSeconds = Math.max(
        0,
        canvasGameConfig.phases.roundDurationSec -
        Math.floor((now.getTime() - activeRound.startedAt.getTime()) / 1000),
      );

      const gameEndAt = getActiveGameEndAt(
        canvasGameConfig,
        activeRound.startedAt,
        activeRound.roundNumber,
      );

      return {
        status: "active",
        round: {
          id: activeRound.id,
          roundNumber: activeRound.roundNumber,
          startedAt: activeRound.startedAt,
          endedAt: activeRound.endedAt ?? null,
          roundDurationSec: canvasGameConfig.phases.roundDurationSec,
          totalRounds: canvasGameConfig.rules.totalRounds,
          gameEndAt: gameEndAt.toISOString(),
        },
        timer: {
          remainingSeconds,
          isRoundExpired: remainingSeconds === 0,
          roundDurationSec: canvasGameConfig.phases.roundDurationSec,
          totalRounds: canvasGameConfig.rules.totalRounds,
          gameEndAt: gameEndAt.toISOString(),
        },
      };
    }

    const lastRound = await voteRoundRepository.findOne({
      where: { canvas: { id: canvasId } },
      order: { roundNumber: "DESC" },
    });

    if (!lastRound?.endedAt) {
      return null;
    }

    const waitingDeadline = new Date(
      lastRound.endedAt.getTime() +
      canvasGameConfig.phases.roundResultDelaySec * 1000,
    );

    if (now >= waitingDeadline) {
      return null;
    }

    const gameEndAt = getWaitingGameEndAt(
      canvasGameConfig,
      lastRound.endedAt,
      lastRound.roundNumber,
    );

    return {
      status: "waiting",
      round: {
        id: lastRound.id,
        roundNumber: lastRound.roundNumber,
        startedAt: lastRound.startedAt,
        endedAt: lastRound.endedAt,
        roundDurationSec: canvasGameConfig.phases.roundDurationSec,
        totalRounds: canvasGameConfig.rules.totalRounds,
        gameEndAt: gameEndAt.toISOString(),
      },
      timer: {
        remainingSeconds: 0,
        isRoundExpired: true,
        roundDurationSec: canvasGameConfig.phases.roundDurationSec,
        totalRounds: canvasGameConfig.rules.totalRounds,
        gameEndAt: gameEndAt.toISOString(),
      },
    };
  },
};
