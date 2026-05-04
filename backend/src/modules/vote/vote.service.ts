import { Server } from "socket.io";
import { getCanvasGameConfigSnapshot } from "../../config/game.config";
import { redisClient } from "../../config/redis";
import { AppDataSource } from "../../database/data-source";
import { Canvas } from "../../entities/canvas.entity";
import { RoundVoterState } from "../../entities/round-voter-state.entity";
import { Vote } from "../../entities/vote.entity";
import { VoteTicket } from "../../entities/vote-ticket.entity";
import { VoteRound } from "../../entities/vote-round.entity";
import { participantSessionService } from "../participant/participant-session.service";

const roundVoterStateRepository = AppDataSource.getRepository(RoundVoterState);
const voteTicketRepository = AppDataSource.getRepository(VoteTicket);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);
const canvasRepository = AppDataSource.getRepository(Canvas);

interface EnsureCurrentRoundTicketsResult {
  roundId: number | null;
  issued: boolean;
}

export const voteService = {
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

    const existingState = await roundVoterStateRepository.findOne({
      where: {
        round: { id: round.id },
        voter: { id: voterId },
      },
    });

    if (existingState) {
      return { roundId: round.id, issued: false };
    }

    const existingLegacyTicketCount = await voteTicketRepository.count({
      where: {
        round: { id: round.id },
        voter: { id: voterId },
      },
    });

    if (existingLegacyTicketCount > 0) {
      return { roundId: round.id, issued: false };
    }

    await roundVoterStateRepository
      .createQueryBuilder()
      .insert()
      .into(RoundVoterState)
      .values({
        round: { id: round.id },
        voter: { id: voterId },
        issuedVotes: canvasGameConfig.rules.votesPerRound,
        usedVotes: 0,
      })
      .orIgnore()
      .execute();

    const createdState = await roundVoterStateRepository.findOne({
      where: {
        round: { id: round.id },
        voter: { id: voterId },
      },
    });

    return {
      roundId: round.id,
      issued: Boolean(createdState && !existingState),
    };
  },

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
      throw new Error("No active round was found.");
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
      throw new Error("Canvas was not found.");
    }

    if (x < 0 || y < 0 || x >= canvas.gridX || y >= canvas.gridY) {
      throw new Error("Invalid cell coordinate.");
    }

    let vote: Vote;

    try {
      vote = await AppDataSource.transaction(async (manager) => {
        const stateUpdate = await manager
          .createQueryBuilder()
          .update(RoundVoterState)
          .set({
            usedVotes: () => '"used_votes" + 1',
          })
          .where('"round_id" = :roundId', { roundId })
          .andWhere('"voter_id" = :voterId', { voterId })
          .andWhere('"used_votes" < "issued_votes"')
          .returning(["id"])
          .execute();

        if ((stateUpdate.affected ?? 0) === 0) {
          const legacyTicket = await manager.findOne(VoteTicket, {
            where: {
              round: { id: roundId },
              voter: { id: voterId },
              isUsed: false,
            },
          });

          if (!legacyTicket) {
            throw new Error("No remaining votes are available.");
          }

          legacyTicket.isUsed = true;
          await manager.save(legacyTicket);

          const legacyVote = manager.create(Vote, {
            round,
            voter: { id: voterId },
            ticket: legacyTicket,
            x,
            y,
            color,
          });

          return manager.save(legacyVote);
        }

        const newVote = manager.create(Vote, {
          round,
          voter: { id: voterId },
          ticket: null,
          x,
          y,
          color,
        });

        return manager.save(newVote);
      });
    } catch (error) {
      if (error instanceof Error && error.message === "No remaining votes are available.") {
        throw error;
      }

      throw new Error(`Failed to submit vote: ${String(error)}`);
    }

    try {
      const redisKey = `vote:round:${roundId}`;
      await redisClient.hIncrBy(redisKey, `${x}:${y}:${color}`, 1);

      if (io) {
        const voteData = await redisClient.hGetAll(redisKey);
        const votes: Record<string, number> = {};

        for (const [key, value] of Object.entries(voteData)) {
          votes[key] = parseInt(value, 10);
        }

        io.to(`canvas:${canvasId}`).emit("vote:update", {
          roundId,
          x,
          y,
          color,
          votes,
        });
      }
    } catch {
      await AppDataSource.transaction(async (manager) => {
        await manager.delete(Vote, vote.id);
        await manager
          .createQueryBuilder()
          .update(RoundVoterState)
          .set({
            usedVotes: () => 'GREATEST("used_votes" - 1, 0)',
          })
          .where('"round_id" = :roundId', { roundId })
          .andWhere('"voter_id" = :voterId', { voterId })
          .execute();
      });

      throw new Error("Failed to update vote status.");
    }

    return vote;
  },

  async getVoteStatus(roundId: number): Promise<Record<string, number>> {
    const redisKey = `vote:round:${roundId}`;
    const data = await redisClient.hGetAll(redisKey);

    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = parseInt(value, 10);
    }

    return result;
  },

  async getRemainingTickets(voterId: number, roundId: number): Promise<number> {
    const state = await roundVoterStateRepository.findOne({
      where: {
        round: { id: roundId },
        voter: { id: voterId },
      },
    });

    if (state) {
      return Math.max(0, state.issuedVotes - state.usedVotes);
    }

    return voteTicketRepository.count({
      where: {
        round: { id: roundId },
        voter: { id: voterId },
        isUsed: false,
      },
    });
  },
};
