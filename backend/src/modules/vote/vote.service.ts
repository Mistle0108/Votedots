import { AppDataSource } from "../../database/data-source";
import { Vote } from "../../entities/vote.entity";
import { VoteTicket } from "../../entities/vote-ticket.entity";
import { VoteRound } from "../../entities/vote-round.entity";
import { Cell } from "../../entities/cell.entity";
import { redisClient } from "../../config/redis";

const voteRepository = AppDataSource.getRepository(Vote);
const voteTicketRepository = AppDataSource.getRepository(VoteTicket);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);
const cellRepository = AppDataSource.getRepository(Cell);

export const voteService = {
  async submit(
    voterId: number,
    roundId: number,
    cellId: number,
    color: string,
  ): Promise<Vote> {
    // 라운드 확인
    const round = await voteRoundRepository.findOne({
      where: { id: roundId, isActive: true },
    });
    if (!round) {
      throw new Error("진행 중인 라운드가 없어요");
    }

    // 셀 확인
    const cell = await cellRepository.findOne({ where: { id: cellId } });
    if (!cell) {
      throw new Error("셀을 찾을 수 없어요");
    }

    // 잠긴 셀 또는 칠해진 셀 투표 불가
    if (cell.status === "painted" || cell.status === "locked") {
      throw new Error("이 셀에는 투표할 수 없어요");
    }

    // 미사용 투표권 조회
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

    // 투표권 소모
    ticket.isUsed = true;
    await voteTicketRepository.save(ticket);

    // 투표 저장
    const vote = voteRepository.create({
      round,
      cell,
      voter: { id: voterId },
      ticket,
      color,
    });
    await voteRepository.save(vote);

    // Redis 득표 집계 +1
    const redisKey = `vote:round:${roundId}`;
    await redisClient.hIncrBy(redisKey, `${cellId}:${color}`, 1);

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
