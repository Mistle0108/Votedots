import { Server } from "socket.io";
import { AppDataSource } from "../../database/data-source";
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

export const voteService = {
  async submit(
    voterId: number,
    sessionId: string,
    canvasId: number,
    roundId: number,
    cellId: number,
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

    const cell = await cellRepository.findOne({ where: { id: cellId } });
    if (!cell) {
      throw new Error("셀을 찾을 수 없어요");
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
          cell,
          voter: { id: voterId },
          ticket,
          color,
        });

        return manager.save(newVote);
      });
    } catch (err) {
      throw new Error(`투표 처리 중 오류가 발생했어요: ${String(err)}`);
    }

    try {
      const redisKey = `vote:round:${roundId}`;
      await redisClient.hIncrBy(redisKey, `${cellId}:${color}`, 1);

      if (io) {
        const voteData = await redisClient.hGetAll(redisKey);
        const votes: Record<string, number> = {};

        for (const [key, value] of Object.entries(voteData)) {
          votes[key] = parseInt(value);
        }

        io.to(`canvas:${canvasId}`).emit("vote:update", {
          roundId,
          cellId,
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
