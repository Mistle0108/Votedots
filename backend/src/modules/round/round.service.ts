import { Server } from "socket.io";
import { AppDataSource } from "../../database/data-source";
import { Canvas } from "../../entities/canvas.entity";
import { Cell, CellStatus } from "../../entities/cell.entity";
import { VoteRound } from "../../entities/vote-round.entity";
import { VoteTicket } from "../../entities/vote-ticket.entity";
import { Vote } from "../../entities/vote.entity";
import { Voter } from "../../entities/voter.entity";
import { redisClient } from "../../config/redis";
import { gameConfig } from "../../config/game.config";

const canvasRepository = AppDataSource.getRepository(Canvas);
const cellRepository = AppDataSource.getRepository(Cell);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);
const voteTicketRepository = AppDataSource.getRepository(VoteTicket);
const voteRepository = AppDataSource.getRepository(Vote);
const voterRepository = AppDataSource.getRepository(Voter);

const VOTES_PER_ROUND = gameConfig.votesPerRound;

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

function getActiveGameEndAt(roundStartedAt: Date, roundNumber: number): Date {
  const remainingRoundsIncludingCurrent =
    gameConfig.totalRounds - roundNumber + 1;

  return new Date(
    roundStartedAt.getTime() +
      remainingRoundsIncludingCurrent * gameConfig.roundDurationSec * 1000 +
      Math.max(0, remainingRoundsIncludingCurrent - 1) *
        gameConfig.roundResultDelaySec *
        1000,
  );
}

function getWaitingGameEndAt(roundEndedAt: Date, roundNumber: number): Date {
  const futureRounds = gameConfig.totalRounds - roundNumber;

  return new Date(
    roundEndedAt.getTime() +
      gameConfig.roundResultDelaySec * 1000 +
      futureRounds * gameConfig.roundDurationSec * 1000 +
      Math.max(0, futureRounds - 1) * gameConfig.roundResultDelaySec * 1000,
  );
}

export const roundService = {
  async startRound(canvasId: number, io?: Server): Promise<VoteRound> {
    const canvas = await canvasRepository.findOne({ where: { id: canvasId } });
    if (!canvas) {
      throw new Error("캔버스를 찾을 수 없어요");
    }

    // 현재 진행 중인 라운드가 있으면 시작 불가
    const activeRound = await voteRoundRepository.findOne({
      where: { canvas: { id: canvasId }, isActive: true },
    });
    if (activeRound) {
      throw new Error("이미 진행 중인 라운드가 있어요");
    }

    // 마지막 라운드 번호 조회
    const lastRound = await voteRoundRepository.findOne({
      where: { canvas: { id: canvasId } },
      order: { roundNumber: "DESC" },
    });
    const nextRoundNumber = lastRound ? lastRound.roundNumber + 1 : 1;

    // 라운드 생성
    const round = voteRoundRepository.create({
      canvas,
      roundNumber: nextRoundNumber,
      startedAt: new Date(),
      isActive: true,
    });
    await voteRoundRepository.save(round);

    // 참가자 전원에게 투표권 발급
    const voters = await voterRepository.find();
    const tickets: Partial<VoteTicket>[] = [];
    for (const voter of voters) {
      for (let i = 0; i < VOTES_PER_ROUND; i++) {
        tickets.push({
          round,
          voter,
          isUsed: false,
        });
      }
    }
    await voteTicketRepository.save(tickets as VoteTicket[]);

    if (io) {
      const remainingRoundsIncludingCurrent =
        gameConfig.totalRounds - round.roundNumber + 1;

      const gameEndAt = getActiveGameEndAt(round.startedAt, round.roundNumber);

      io.to(`canvas:${canvasId}`).emit("round:started", {
        roundId: round.id,
        roundNumber: round.roundNumber,
        startedAt: round.startedAt,
        roundDurationSec: gameConfig.roundDurationSec,
        totalRounds: gameConfig.totalRounds,
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
    const round = await voteRoundRepository.findOne({
      where: { id: roundId, canvas: { id: canvasId }, isActive: true },
    });
    if (!round) {
      throw new Error("진행 중인 라운드를 찾을 수 없어요");
    }

    // Redis에서 Cell 득표 집계 조회
    const redisKey = `vote:round:${roundId}`;
    const voteData = await redisClient.hGetAll(redisKey);

    let winningCellId: number | null = null;
    let winningColor: string | null = null;
    let maxVotes = 0;

    const candidates: { cellId: number; color: string; count: number }[] = [];

    for (const [key, value] of Object.entries(voteData)) {
      const [cellId, color] = key.split(":");
      const count = parseInt(value);
      candidates.push({ cellId: parseInt(cellId), color, count });
      if (count > maxVotes) {
        maxVotes = count;
      }
    }

    // 동점 처리 — 랜덤 선택
    const topCandidates = candidates.filter((c) => c.count === maxVotes);
    if (topCandidates.length > 0) {
      const winner =
        topCandidates[Math.floor(Math.random() * topCandidates.length)];
      winningCellId = winner.cellId;
      winningColor = winner.color;
    }

    // Redis 득표가 없으면 DB에서 직접 집계
    if (candidates.length === 0) {
      const votes = await voteRepository.find({
        where: { round: { id: roundId } },
        relations: ["cell"],
      });

      const countMap = new Map<
        string,
        { cellId: number; color: string; count: number }
      >();
      for (const vote of votes) {
        const key = `${vote.cell.id}:${vote.color}`;
        const existing = countMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          countMap.set(key, {
            cellId: vote.cell.id,
            color: vote.color,
            count: 1,
          });
        }
      }

      let max = 0;
      const dbCandidates = Array.from(countMap.values());
      for (const c of dbCandidates) {
        if (c.count > max) max = c.count;
      }
      const topDbCandidates = dbCandidates.filter((c) => c.count === max);
      if (topDbCandidates.length > 0) {
        const winner =
          topDbCandidates[Math.floor(Math.random() * topDbCandidates.length)];
        winningCellId = winner.cellId;
        winningColor = winner.color;
      }
    }

    // 당선 셀 색상 업데이트
    let winningCell: Cell | null = null;
    if (winningCellId && winningColor) {
      await cellRepository.update(winningCellId, {
        color: winningColor,
        status: CellStatus.PAINTED,
      });
      winningCell = await cellRepository.findOne({
        where: { id: winningCellId },
      });
    }

    // 라운드 종료 처리
    round.isActive = false;
    round.endedAt = new Date();
    await voteRoundRepository.save(round);

    // Redis 키 삭제
    await redisClient.del(redisKey);

    if (io) {
      io.to(`canvas:${canvasId}`).emit("round:ended", {
        roundId: round.id,
        roundNumber: round.roundNumber,
        endedAt: round.endedAt,
        winningCell: winningCell
          ? {
              id: winningCell.id,
              x: winningCell.x,
              y: winningCell.y,
              color: winningCell.color,
            }
          : null,
      });

      if (winningCell) {
        io.to(`canvas:${canvasId}`).emit("canvas:updated", {
          cellId: winningCell.id,
          x: winningCell.x,
          y: winningCell.y,
          color: winningCell.color,
        });
      }
    }

    return round;
  },

  async getActiveRoundState(
    canvasId: number,
  ): Promise<RoundStateResponse | null> {
    const now = new Date();

    const activeRound = await voteRoundRepository.findOne({
      where: { canvas: { id: canvasId }, isActive: true },
      order: { roundNumber: "DESC" },
    });

    if (activeRound) {
      const remainingSeconds = Math.max(
        0,
        gameConfig.roundDurationSec -
          Math.floor((now.getTime() - activeRound.startedAt.getTime()) / 1000),
      );

      const gameEndAt = getActiveGameEndAt(
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
          roundDurationSec: gameConfig.roundDurationSec,
          totalRounds: gameConfig.totalRounds,
          gameEndAt: gameEndAt.toISOString(),
        },
        timer: {
          remainingSeconds,
          isRoundExpired: remainingSeconds === 0,
          roundDurationSec: gameConfig.roundDurationSec,
          totalRounds: gameConfig.totalRounds,
          gameEndAt: gameEndAt.toISOString(),
        },
      };
    }

    const lastRound = await voteRoundRepository.findOne({
      where: { canvas: { id: canvasId } },
      order: { roundNumber: "DESC" },
    });

    if (!lastRound?.endedAt) return null;

    const waitingDeadline = new Date(
      lastRound.endedAt.getTime() + gameConfig.roundResultDelaySec * 1000,
    );

    if (now >= waitingDeadline) return null;

    const gameEndAt = getWaitingGameEndAt(
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
        roundDurationSec: gameConfig.roundDurationSec,
        totalRounds: gameConfig.totalRounds,
        gameEndAt: gameEndAt.toISOString(),
      },
      timer: {
        remainingSeconds: 0,
        isRoundExpired: true,
        roundDurationSec: gameConfig.roundDurationSec,
        totalRounds: gameConfig.totalRounds,
        gameEndAt: gameEndAt.toISOString(),
      },
    };
  },
};
