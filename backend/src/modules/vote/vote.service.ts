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

    // 트랜잭션 — 투표권 소모 + 투표 저장 원자적 처리
    // 둘 다 성공하거나 둘 다 실패 (중간 상태 없음)
    let vote: Vote;
    try {
      vote = await AppDataSource.transaction(async (manager) => {
        // 투표권 소모
        ticket.isUsed = true;
        await manager.save(ticket);

        // 투표 저장
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
      // 트랜잭션 실패 — DB 롤백됨, Redis 진행 안 함
      throw new Error(`투표 처리 중 오류가 발생했어요: ${String(err)}`);
    }

    // 트랜잭션 성공 후에만 Redis 집계 진행
    try {
      const redisKey = `vote:round:${roundId}`;
      await redisClient.hIncrBy(redisKey, `${cellId}:${color}`, 1);
    } catch (err) {
      // Redis 실패 — DB는 이미 저장됨
      // 라운드 종료 시 DB fallback 집계로 커버
      console.error(
        `Redis 집계 실패 (roundId: ${roundId}, cellId: ${cellId}):`,
        err,
      );
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
