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
  cellId: number;
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

function toPercent(numerator: number, denominator: number): string {
  if (denominator <= 0) {
    return "0.00";
  }

  return ((numerator / denominator) * 100).toFixed(2);
}

function buildMostVotedCell(
  cellVoteMap: Map<
    number,
    {
      x: number;
      y: number;
      voteCount: number;
    }
  >,
): TopCellAggregate | null {
  let topCell: TopCellAggregate | null = null;

  for (const [cellId, value] of cellVoteMap.entries()) {
    if (!topCell || value.voteCount > topCell.voteCount) {
      topCell = {
        cellId,
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
    const roundCellKey = `${vote.round.id}:${vote.cell.id}`;
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
  async saveRoundSummary(
    canvasId: number,
    roundId: number,
  ): Promise<RoundSummary> {
    const round = await voteRoundRepository.findOne({
      where: { id: roundId, canvas: { id: canvasId } },
    });

    if (!round) {
      throw new Error("Round was not found.");
    }

    const canvas = await canvasRepository.findOne({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new Error("Canvas was not found.");
    }

    const [votes, totalCellCount, currentPaintedCellCount] = await Promise.all([
      voteRepository.find({
        where: { round: { id: roundId } },
        relations: ["cell", "voter", "round"],
      }),
      cellRepository.count({
        where: { canvas: { id: canvasId } },
      }),
      cellRepository.count({
        where: { canvas: { id: canvasId }, status: CellStatus.PAINTED },
      }),
    ]);

    const participantIds = new Set<number>();
    const paintedCellIds = new Set<number>();
    const cellVoteMap = new Map<
      number,
      {
        x: number;
        y: number;
        voteCount: number;
      }
    >();
    const colorBucketsByCell = new Map<number, Map<string, number>>();

    for (const vote of votes) {
      participantIds.add(vote.voter.id);
      paintedCellIds.add(vote.cell.id);

      const cellAggregate = cellVoteMap.get(vote.cell.id);

      if (cellAggregate) {
        cellAggregate.voteCount += 1;
      } else {
        cellVoteMap.set(vote.cell.id, {
          x: vote.cell.x,
          y: vote.cell.y,
          voteCount: 1,
        });
      }

      const colorBuckets =
        colorBucketsByCell.get(vote.cell.id) ?? new Map<string, number>();
      colorBuckets.set(vote.color, (colorBuckets.get(vote.color) ?? 0) + 1);
      colorBucketsByCell.set(vote.cell.id, colorBuckets);
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
      paintedCellCount: paintedCellIds.size,
      totalCellCount,
      currentPaintedCellCount,
      canvasProgressPercent: toPercent(currentPaintedCellCount, totalCellCount),
      mostVotedCellId: mostVotedCell?.cellId ?? null,
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
      throw new Error("Canvas was not found.");
    }

    const [votes, tickets, rounds, cells, existingSummary] = await Promise.all([
      voteRepository.find({
        where: { round: { canvas: { id: canvasId } } },
        relations: ["cell", "voter", "round"],
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
      number,
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

      const cellAggregate = cellVoteMap.get(vote.cell.id);
      if (cellAggregate) {
        cellAggregate.voteCount += 1;
      } else {
        cellVoteMap.set(vote.cell.id, {
          x: vote.cell.x,
          y: vote.cell.y,
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
    let paintedCellCount = 0;

    for (const cell of cells) {
      if (cell.status !== CellStatus.PAINTED || !cell.color) {
        continue;
      }

      paintedCellCount += 1;
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
    const emptyCellCount = Math.max(0, totalCellCount - paintedCellCount);
    const randomResolvedCellCount = countRandomResolvedCellsFromVotes(votes);

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
      mostVotedCellId: mostVotedCell?.cellId ?? null,
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
