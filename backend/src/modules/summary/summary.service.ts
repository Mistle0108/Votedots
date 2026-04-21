import { AppDataSource } from "../../database/data-source";
import { Cell, CellStatus } from "../../entities/cell.entity";
import { Canvas } from "../../entities/canvas.entity";
import { GameSummary } from "../../entities/game-summary.entity";
import { RoundSummary } from "../../entities/round-summary.entity";
import { VoteRound } from "../../entities/vote-round.entity";
import { VoteTicket } from "../../entities/vote-ticket.entity";
import { Vote } from "../../entities/vote.entity";

const canvasRepository = AppDataSource.getRepository(Canvas);
const cellRepository = AppDataSource.getRepository(Cell);
const voteRepository = AppDataSource.getRepository(Vote);
const voteTicketRepository = AppDataSource.getRepository(VoteTicket);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);
const roundSummaryRepository = AppDataSource.getRepository(RoundSummary);
const gameSummaryRepository = AppDataSource.getRepository(GameSummary);

type TopCellAggregate = {
  x: number;
  y: number;
  voteCount: number;
};

type TopColorAggregate = {
  color: string;
  voteCount: number;
};

type TopVoterAggregate = {
  voterId: number;
  name: string;
  voteCount: number;
};

type RoundVoteExtreme = {
  roundId: number;
  roundNumber: number;
  voteCount: number;
} | null;

type RoundVoteExtremeRow = {
  roundId: number | string;
  roundNumber: number | string;
  voteCount: number | string;
};

function toPercent(numerator: number, denominator: number): string {
  if (denominator <= 0) {
    return "0.00";
  }

  return ((numerator / denominator) * 100).toFixed(2);
}

function buildMostVotedCell(
  cellVoteMap: Map<
    string,
    {
      x: number;
      y: number;
      voteCount: number;
    }
  >,
): TopCellAggregate | null {
  let topCell: TopCellAggregate | null = null;

  for (const value of cellVoteMap.values()) {
    if (!topCell || value.voteCount > topCell.voteCount) {
      topCell = {
        x: value.x,
        y: value.y,
        voteCount: value.voteCount,
      };
    }
  }

  return topCell;
}

function countRandomResolvedCellsFromVotes(votes: Vote[]): number {
  const colorBucketsByRoundCell = new Map<string, Map<string, number>>();

  for (const vote of votes) {
    const roundCellKey = `${vote.round.id}:${vote.x}:${vote.y}`;
    const colorBuckets =
      colorBucketsByRoundCell.get(roundCellKey) ?? new Map<string, number>();

    colorBuckets.set(vote.color, (colorBuckets.get(vote.color) ?? 0) + 1);
    colorBucketsByRoundCell.set(roundCellKey, colorBuckets);
  }

  let randomResolvedCellCount = 0;

  for (const colorBuckets of colorBucketsByRoundCell.values()) {
    let maxVotes = 0;
    let maxCountColors = 0;

    for (const voteCount of colorBuckets.values()) {
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        maxCountColors = 1;
        continue;
      }

      if (voteCount === maxVotes) {
        maxCountColors += 1;
      }
    }

    if (maxCountColors > 1) {
      randomResolvedCellCount += 1;
    }
  }

  return randomResolvedCellCount;
}

export const summaryService = {
  async getRoundSummary(
    canvasId: number,
    roundId: number,
  ): Promise<RoundSummary> {
    const round = await voteRoundRepository.findOne({
      where: { id: roundId, canvas: { id: canvasId } },
    });

    if (!round) {
      throw new Error("해당 캔버스에 속한 라운드가 존재하지 않습니다.");
    }

    const summary = await roundSummaryRepository.findOne({
      where: { canvas: { id: canvasId }, round: { id: roundId } },
      relations: ["canvas", "round"],
    });

    if (!summary) {
      throw new Error("라운드 summary가 존재하지 않습니다.");
    }

    return summary;
  },

  async getGameSummary(canvasId: number): Promise<GameSummary> {
    const canvas = await canvasRepository.findOne({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new Error("캔버스가 존재하지 않습니다.");
    }

    const summary = await gameSummaryRepository.findOne({
      where: { canvas: { id: canvasId } },
      relations: ["canvas"],
    });

    if (!summary) {
      throw new Error("게임 summary가 존재하지 않습니다.");
    }

    return summary;
  },

  async getQuietestRound(canvasId: number): Promise<RoundVoteExtreme> {
    const row = await voteRoundRepository
      .createQueryBuilder("round")
      .leftJoin("round.votes", "vote")
      .select("round.id", "roundId")
      .addSelect("round.roundNumber", "roundNumber")
      .addSelect("COUNT(vote.id)", "voteCount")
      .where("round.canvas_id = :canvasId", { canvasId })
      .groupBy("round.id")
      .addGroupBy("round.roundNumber")
      .orderBy("COUNT(vote.id)", "ASC")
      .addOrderBy("round.roundNumber", "ASC")
      .getRawOne<RoundVoteExtremeRow>();

    if (!row) {
      return null;
    }

    return {
      roundId: Number(row.roundId),
      roundNumber: Number(row.roundNumber),
      voteCount: Number(row.voteCount),
    };
  },

  async saveRoundSummary(
    canvasId: number,
    roundId: number,
  ): Promise<RoundSummary> {
    const round = await voteRoundRepository.findOne({
      where: { id: roundId, canvas: { id: canvasId } },
    });

    if (!round) {
      throw new Error("해당 캔버스에 속한 라운드가 존재하지 않습니다.");
    }

    const canvas = await canvasRepository.findOne({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new Error("캔버스가 존재하지 않습니다.");
    }

    const [votes, currentPaintedCellCount] = await Promise.all([
      voteRepository.find({
        where: { round: { id: roundId } },
        relations: ["voter", "round"],
      }),
      cellRepository.count({
        where: { canvas: { id: canvasId }, status: CellStatus.PAINTED },
      }),
    ]);

    const totalCellCount = canvas.gridX * canvas.gridY;

    const participantIds = new Set<number>();
    const paintedCellCoordinates = new Set<string>();
    const cellVoteMap = new Map<
      string,
      {
        x: number;
        y: number;
        voteCount: number;
      }
    >();
    const colorBucketsByCell = new Map<string, Map<string, number>>();

    for (const vote of votes) {
      participantIds.add(vote.voter.id);

      const cellKey = `${vote.x}:${vote.y}`;
      paintedCellCoordinates.add(cellKey);

      const cellAggregate = cellVoteMap.get(cellKey);

      if (cellAggregate) {
        cellAggregate.voteCount += 1;
      } else {
        cellVoteMap.set(cellKey, {
          x: vote.x,
          y: vote.y,
          voteCount: 1,
        });
      }

      const colorBuckets =
        colorBucketsByCell.get(cellKey) ?? new Map<string, number>();
      colorBuckets.set(vote.color, (colorBuckets.get(vote.color) ?? 0) + 1);
      colorBucketsByCell.set(cellKey, colorBuckets);
    }

    let randomResolvedCellCount = 0;

    for (const colorBuckets of colorBucketsByCell.values()) {
      let maxVotes = 0;
      let maxCountColors = 0;

      for (const voteCount of colorBuckets.values()) {
        if (voteCount > maxVotes) {
          maxVotes = voteCount;
          maxCountColors = 1;
          continue;
        }

        if (voteCount === maxVotes) {
          maxCountColors += 1;
        }
      }

      if (maxCountColors > 1) {
        randomResolvedCellCount += 1;
      }
    }

    const mostVotedCell = buildMostVotedCell(cellVoteMap);

    const summary = roundSummaryRepository.create({
      canvas: { id: canvasId },
      round: { id: roundId },
      roundNumber: round.roundNumber,
      participantCount: participantIds.size,
      totalVotes: votes.length,
      paintedCellCount: paintedCellCoordinates.size,
      totalCellCount,
      currentPaintedCellCount,
      canvasProgressPercent: toPercent(currentPaintedCellCount, totalCellCount),
      mostVotedCellId: null,
      mostVotedCellX: mostVotedCell?.x ?? null,
      mostVotedCellY: mostVotedCell?.y ?? null,
      mostVotedCellVoteCount: mostVotedCell?.voteCount ?? 0,
      randomResolvedCellCount,
    });

    return roundSummaryRepository.save(summary);
  },

  async saveGameSummary(canvasId: number): Promise<GameSummary> {
    const canvas = await canvasRepository.findOne({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new Error("캔버스가 존재하지 않습니다.");
    }

    const [votes, tickets, rounds, cells, existingSummary] = await Promise.all([
      voteRepository.find({
        where: { round: { canvas: { id: canvasId } } },
        relations: ["voter", "round"],
      }),
      voteTicketRepository.find({
        where: { round: { canvas: { id: canvasId } } },
      }),
      voteRoundRepository.find({
        where: { canvas: { id: canvasId } },
      }),
      cellRepository.find({
        where: { canvas: { id: canvasId } },
      }),
      gameSummaryRepository.findOne({
        where: { canvas: { id: canvasId } },
      }),
    ]);

    const participantMap = new Map<number, { voterId: number; name: string }>();
    const voterCountMap = new Map<number, TopVoterAggregate>();
    const cellVoteMap = new Map<
      string,
      { x: number; y: number; voteCount: number }
    >();
    const colorVoteMap = new Map<string, number>();
    const roundVoteMap = new Map<
      number,
      { roundNumber: number; voteCount: number }
    >();

    for (const vote of votes) {
      participantMap.set(vote.voter.id, {
        voterId: vote.voter.id,
        name: vote.voter.nickname,
      });

      const voterAggregate = voterCountMap.get(vote.voter.id);
      if (voterAggregate) {
        voterAggregate.voteCount += 1;
      } else {
        voterCountMap.set(vote.voter.id, {
          voterId: vote.voter.id,
          name: vote.voter.nickname,
          voteCount: 1,
        });
      }

      const cellKey = `${vote.x}:${vote.y}`;
      const cellAggregate = cellVoteMap.get(cellKey);
      if (cellAggregate) {
        cellAggregate.voteCount += 1;
      } else {
        cellVoteMap.set(cellKey, {
          x: vote.x,
          y: vote.y,
          voteCount: 1,
        });
      }

      colorVoteMap.set(vote.color, (colorVoteMap.get(vote.color) ?? 0) + 1);

      const roundAggregate = roundVoteMap.get(vote.round.id);
      if (roundAggregate) {
        roundAggregate.voteCount += 1;
      } else {
        roundVoteMap.set(vote.round.id, {
          roundNumber: vote.round.roundNumber,
          voteCount: 1,
        });
      }
    }

    const mostVotedCell = buildMostVotedCell(cellVoteMap);

    let mostSelectedColor: TopColorAggregate | null = null;
    for (const [color, voteCount] of colorVoteMap.entries()) {
      if (!mostSelectedColor || voteCount > mostSelectedColor.voteCount) {
        mostSelectedColor = { color, voteCount };
      }
    }

    const paintedColorMap = new Map<string, number>();

    for (const cell of cells) {
      if (cell.status !== CellStatus.PAINTED || !cell.color) {
        continue;
      }

      paintedColorMap.set(
        cell.color,
        (paintedColorMap.get(cell.color) ?? 0) + 1,
      );
    }

    let mostPaintedColor: TopColorAggregate | null = null;
    for (const [color, count] of paintedColorMap.entries()) {
      if (!mostPaintedColor || count > mostPaintedColor.voteCount) {
        mostPaintedColor = { color, voteCount: count };
      }
    }

    let topVoter: TopVoterAggregate | null = null;
    for (const voterAggregate of voterCountMap.values()) {
      if (!topVoter || voterAggregate.voteCount > topVoter.voteCount) {
        topVoter = voterAggregate;
      }
    }

    let hottestRound: {
      roundId: number;
      roundNumber: number;
      voteCount: number;
    } | null = null;

    for (const round of rounds) {
      const roundAggregate = roundVoteMap.get(round.id);
      const voteCount = roundAggregate?.voteCount ?? 0;

      if (!hottestRound || voteCount > hottestRound.voteCount) {
        hottestRound = {
          roundId: round.id,
          roundNumber: round.roundNumber,
          voteCount,
        };
      }
    }

    const totalCellCount = cells.length;

    const randomResolvedCellCount = countRandomResolvedCellsFromVotes(votes);
    const paintedCells = cells.filter(
      (cell) => cell.status === CellStatus.PAINTED,
    );
    const paintedCellCount = paintedCells.length;
    const emptyCellCount = Math.max(0, totalCellCount - paintedCellCount);

    const nextSummary = gameSummaryRepository.create({
      id: existingSummary?.id,
      canvas: { id: canvasId },
      totalRounds: rounds.length,
      participantCount: participantMap.size,
      issuedTicketCount: tickets.length,
      totalVotes: votes.length,
      ticketUsageRate: toPercent(votes.length, tickets.length),
      totalCellCount,
      paintedCellCount,
      emptyCellCount,
      canvasCompletionPercent: toPercent(paintedCellCount, totalCellCount),
      mostVotedCellX: mostVotedCell?.x ?? null,
      mostVotedCellY: mostVotedCell?.y ?? null,
      mostVotedCellVoteCount: mostVotedCell?.voteCount ?? 0,
      randomResolvedCellCount,
      usedColorCount: colorVoteMap.size,
      mostSelectedColor: mostSelectedColor?.color ?? null,
      mostSelectedColorVoteCount: mostSelectedColor?.voteCount ?? 0,
      mostPaintedColor: mostPaintedColor?.color ?? null,
      mostPaintedColorCellCount: mostPaintedColor?.voteCount ?? 0,
      topVoterId: topVoter?.voterId ?? null,
      topVoterName: topVoter?.name ?? null,
      topVoterVoteCount: topVoter?.voteCount ?? 0,
      hottestRoundId: hottestRound?.roundId ?? null,
      hottestRoundNumber: hottestRound?.roundNumber ?? null,
      hottestRoundVoteCount: hottestRound?.voteCount ?? 0,
      topVotersJson: Array.from(voterCountMap.values())
        .sort((a, b) => b.voteCount - a.voteCount)
        .slice(0, 10)
        .map((voter) => ({
          voterId: voter.voterId,
          name: voter.name,
          voteCount: voter.voteCount,
        })),
      participantsJson: Array.from(participantMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    });

    return gameSummaryRepository.save(nextSummary);
  },
};
