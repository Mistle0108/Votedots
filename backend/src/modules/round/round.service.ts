import { AppDataSource } from "../../database/data-source";
import { Canvas } from "../../entities/canvas.entity";
import { Cell, CellStatus } from "../../entities/cell.entity";
import { VoteRound } from "../../entities/vote-round.entity";
import { VoteTicket } from "../../entities/vote-ticket.entity";
import { Vote } from "../../entities/vote.entity";
import { Voter } from "../../entities/voter.entity";
import { redisClient } from "../../config/redis";

const canvasRepository = AppDataSource.getRepository(Canvas);
const cellRepository = AppDataSource.getRepository(Cell);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);
const voteTicketRepository = AppDataSource.getRepository(VoteTicket);
const voteRepository = AppDataSource.getRepository(Vote);
const voterRepository = AppDataSource.getRepository(Voter);

const VOTES_PER_ROUND = parseInt(process.env.VOTES_PER_ROUND ?? "3");

export const roundService = {
  async startRound(canvasId: number): Promise<VoteRound> {
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

    return round;
  },

  async endRound(canvasId: number, roundId: number): Promise<VoteRound> {
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
    if (winningCellId && winningColor) {
      await cellRepository.update(winningCellId, {
        color: winningColor,
        status: CellStatus.PAINTED,
      });
    }

    // 라운드 종료 처리
    round.isActive = false;
    round.endedAt = new Date();
    await voteRoundRepository.save(round);

    // Redis 키 삭제
    await redisClient.del(redisKey);

    return round;
  },

  async getActiveRound(canvasId: number): Promise<VoteRound | null> {
    return voteRoundRepository.findOne({
      where: { canvas: { id: canvasId }, isActive: true },
    });
  },
};
