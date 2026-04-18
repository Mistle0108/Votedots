import { Server } from "socket.io";
import { getCanvasGameConfigSnapshot } from "../../config/game.config";
import { AppDataSource } from "../../database/data-source";
import { Canvas } from "../../entities/canvas.entity";
import { Vote } from "../../entities/vote.entity";
import { VoteTicket } from "../../entities/vote-ticket.entity";
import { VoteRound } from "../../entities/vote-round.entity";
import { Cell } from "../../entities/cell.entity";
import { redisClient } from "../../config/redis";
import { participantSessionService } from "../participant/participant-session.service";

const voteRepository = AppDataSource.getRepository(Vote);
const voteTicketRepository = AppDataSource.getRepository(VoteTicket);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);
const cellRepository = AppDataSource.getRepository(Cell);
const canvasRepository = AppDataSource.getRepository(Canvas);

interface EnsureCurrentRoundTicketsResult {
  roundId: number | null;
  issued: boolean;
}

function getIssuedVotersKey(roundId: number): string {
  return `vote:round:${roundId}:issued-voters`;
}

export const voteService = {
  async registerIssuedVoters(
    roundId: number,
    voterIds: number[],
  ): Promise<void> {
    if (voterIds.length === 0) {
      return;
    }

    await redisClient.sAdd(getIssuedVotersKey(roundId), voterIds.map(String));
  },

  async clearIssuedVoters(roundId: number): Promise<void> {
    await redisClient.del(getIssuedVotersKey(roundId));
  },

  async ensureCurrentRoundTicketsForParticipant(
    canvasId: number,
    voterId: number,
  ): Promise<EnsureCurrentRoundTicketsResult> {
    const round = await voteRoundRepository.findOne({
      where: { canvas: { id: canvasId }, isActive: true },
    });

    if (!round) {
      return { roundId: null, issued: false };
    }

    const canvas = await canvasRepository.findOne({
      where: { id: canvasId },
    });

    if (!canvas) {
      return { roundId: round.id, issued: false };
    }

    const canvasGameConfig = getCanvasGameConfigSnapshot(canvas);
    const roundEndsAt = new Date(
      round.startedAt.getTime() +
        canvasGameConfig.phases.roundDurationSec * 1000,
    );

    if (roundEndsAt.getTime() <= Date.now()) {
      return { roundId: round.id, issued: false };
    }

    const issuedVotersKey = getIssuedVotersKey(round.id);

    const existingTicketCount = await voteTicketRepository.count({
      where: {
        round: { id: round.id },
        voter: { id: voterId },
      },
    });

    if (existingTicketCount > 0) {
      await redisClient.sAdd(issuedVotersKey, String(voterId));
      return { roundId: round.id, issued: false };
    }

    const addedCount = await redisClient.sAdd(issuedVotersKey, String(voterId));

    if (addedCount === 0) {
      return { roundId: round.id, issued: false };
    }

    try {
      const tickets = Array.from(
        { length: canvasGameConfig.rules.votesPerRound },
        () => ({
          round: { id: round.id },
          voter: { id: voterId },
          isUsed: false,
        }),
      );

      if (tickets.length > 0) {
        await voteTicketRepository.insert(tickets);
      }

      return { roundId: round.id, issued: true };
    } catch (error) {
      await redisClient.sRem(issuedVotersKey, String(voterId));
      throw new Error(
        `현재 라운드 투표권 지급 중 오류가 발생했어요: ${String(error)}`,
      );
    }
  },
  // TO-BE
  async submit(
    voterId: number,
    sessionId: string,
    canvasId: number,
    roundId: number,
    x: number,
    y: number,
    color: string,
    io?: Server,
  ): Promise<Vote> {
    const round = await voteRoundRepository.findOne({
      where: { id: roundId, canvas: { id: canvasId }, isActive: true },
    });
    if (!round) {
      throw new Error("진행 중인 라운드가 없어요");
    }

    await participantSessionService.assertVotingParticipant(
      canvasId,
      sessionId,
      voterId,
    );

    const canvas = await canvasRepository.findOne({
      where: { id: canvasId },
    });
    if (!canvas) {
      throw new Error("캔버스를 찾을 수 없어요");
    }

    if (x < 0 || y < 0 || x >= canvas.gridX || y >= canvas.gridY) {
      throw new Error("유효하지 않은 셀 좌표예요");
    }

    const ticket = await voteTicketRepository.findOne({
      where: {
        round: { id: roundId },
        voter: { id: voterId },
        isUsed: false,
      },
    });
    if (!ticket) {
      throw new Error("남은 투표권이 없어요");
    }

    let vote: Vote;
    try {
      vote = await AppDataSource.transaction(async (manager) => {
        ticket.isUsed = true;
        await manager.save(ticket);

        const newVote = manager.create(Vote, {
          round,
          voter: { id: voterId },
          ticket,
          x,
          y,
          color,
        });

        return manager.save(newVote);
      });
    } catch (err) {
      throw new Error(`투표 처리 중 오류가 발생했어요: ${String(err)}`);
    }

    try {
      const redisKey = `vote:round:${roundId}`;
      await redisClient.hIncrBy(redisKey, `${x}:${y}:${color}`, 1);

      if (io) {
        const voteData = await redisClient.hGetAll(redisKey);
        const votes: Record<string, number> = {};

        for (const [key, value] of Object.entries(voteData)) {
          votes[key] = parseInt(value);
        }

        io.to(`canvas:${canvasId}`).emit("vote:update", {
          roundId,
          x,
          y,
          color,
          votes,
        });
      }
    } catch (err) {
      await AppDataSource.transaction(async (manager) => {
        ticket.isUsed = false;
        await manager.save(ticket);
        await manager.delete(Vote, vote.id);
      });

      throw new Error("투표 집계 중 오류가 발생했어요. 다시 시도해주세요");
    }

    return vote;
  },

  async getVoteStatus(roundId: number): Promise<Record<string, number>> {
    const redisKey = `vote:round:${roundId}`;
    const data = await redisClient.hGetAll(redisKey);

    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = parseInt(value);
    }

    return result;
  },

  async getRemainingTickets(voterId: number, roundId: number): Promise<number> {
    return voteTicketRepository.count({
      where: {
        round: { id: roundId },
        voter: { id: voterId },
        isUsed: false,
      },
    });
  },
};
