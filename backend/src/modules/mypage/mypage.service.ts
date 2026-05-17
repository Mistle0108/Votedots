import { AppDataSource } from "../../database/data-source";
import { CanvasParticipantSummary } from "../../entities/canvas-participant-summary.entity";
import { GameSummary } from "../../entities/game-summary.entity";
const canvasParticipantSummaryRepository = AppDataSource.getRepository(
  CanvasParticipantSummary,
);
const gameSummaryRepository = AppDataSource.getRepository(GameSummary);

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 8;

export interface ParticipationListParams {
  voterId: number;
  page?: number;
  limit?: number;
  size?: string | null;
}

export interface MypageParticipationListItem {
  canvasId: number;
  participation: CanvasParticipantSummary;
  gameSummary: GameSummary | null;
}

export interface MypageParticipationDetail {
  canvasId: number;
  participation: CanvasParticipantSummary;
  gameSummary: GameSummary | null;
}

function parseSizeFilter(size: string | null | undefined): {
  gridX: number;
  gridY: number;
} | null {
  if (!size || size === "all") {
    return null;
  }

  const matched = size.match(/^(\d+)x(\d+)$/);

  if (!matched) {
    return null;
  }

  const gridX = Number(matched[1]);
  const gridY = Number(matched[2]);

  if (!Number.isInteger(gridX) || !Number.isInteger(gridY)) {
    return null;
  }

  return { gridX, gridY };
}

function normalizePage(value: number | undefined): number {
  if (!value || !Number.isInteger(value) || value <= 0) {
    return DEFAULT_PAGE;
  }

  return value;
}

function normalizeLimit(value: number | undefined): number {
  if (!value || !Number.isInteger(value) || value <= 0) {
    return DEFAULT_LIMIT;
  }

  return value;
}

async function findGameSummariesByCanvasIds(canvasIds: number[]) {
  if (canvasIds.length === 0) {
    return [];
  }

  const query = gameSummaryRepository
    .createQueryBuilder("summary")
    .where("summary.canvas_id IN (:...canvasIds)", { canvasIds })
    .addSelect("summary.canvas_id", "summary_canvas_id");
  const { entities, raw } = await query.getRawAndEntities();

  return entities.map((summary, index) => ({
    canvasId: Number(raw[index]["summary_canvas_id"]),
    summary,
  }));
}

async function findGameSummaryByCanvasId(canvasId: number) {
  const query = gameSummaryRepository
    .createQueryBuilder("summary")
    .where("summary.canvas_id = :canvasId", { canvasId })
    .addSelect("summary.canvas_id", "summary_canvas_id");
  const { entities, raw } = await query.getRawAndEntities();
  const summary = entities[0] ?? null;

  if (!summary) {
    return null;
  }

  return {
    canvasId: Number(raw[0]["summary_canvas_id"]),
    summary,
  };
}

export const mypageService = {
  async getParticipationList(params: ParticipationListParams) {
    const page = normalizePage(params.page);
    const limit = normalizeLimit(params.limit);
    const sizeFilter = parseSizeFilter(params.size);

    const query = canvasParticipantSummaryRepository
      .createQueryBuilder("participation")
      .where("participation.voter_id = :voterId", {
        voterId: params.voterId,
      });

    if (sizeFilter) {
      query
        .andWhere("participation.grid_x = :gridX", { gridX: sizeFilter.gridX })
        .andWhere("participation.grid_y = :gridY", { gridY: sizeFilter.gridY });
    }

    const totalItems = await query.getCount();
    const { entities, raw } = await query
      .clone()
      .addSelect("participation.canvas_id", "participation_canvas_id")
      .orderBy("participation.last_voted_at", "DESC")
      .addOrderBy("participation.id", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;
    const items: MypageParticipationListItem[] = entities.map((participation, index) => ({
      canvasId: Number(raw[index]["participation_canvas_id"]),
      participation,
      gameSummary: null,
    }));
    const canvasIds = items.map((item) => item.canvasId);
    const summaries = await findGameSummariesByCanvasIds(canvasIds);
    const summaryByCanvasId = new Map(
      summaries.map((item) => [item.canvasId, item.summary] as const),
    );

    return {
      items: items.map((item) => ({
        canvasId: item.canvasId,
        participation: item.participation,
        gameSummary: summaryByCanvasId.get(item.canvasId) ?? null,
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
      },
    };
  },

  async getParticipationDetail(voterId: number, canvasId: number) {
    const { entities } = await canvasParticipantSummaryRepository
      .createQueryBuilder("participation")
      .where("participation.voter_id = :voterId", { voterId })
      .andWhere("participation.canvas_id = :canvasId", { canvasId })
      .getRawAndEntities();
    const participation = entities[0] ?? null;

    if (!participation) {
      return null;
    }

    const gameSummaryResult = await findGameSummaryByCanvasId(canvasId);

    return {
      canvasId,
      participation,
      gameSummary: gameSummaryResult?.summary ?? null,
    };
  },

  async getStats(voterId: number) {
    const participations = await canvasParticipantSummaryRepository
      .createQueryBuilder("participation")
      .where("participation.voter_id = :voterId", { voterId })
      .orderBy("participation.ended_at", "DESC")
      .getMany();

    const sizeCounts = new Map<string, { gridX: number; gridY: number; count: number }>();
    let totalUsedVoteCount = 0;
    let topVoterAchievedCount = 0;

    for (const participation of participations) {
      totalUsedVoteCount += participation.usedVoteCount;

      if (participation.isTopVoter) {
        topVoterAchievedCount += 1;
      }

      const sizeKey = `${participation.gridX}x${participation.gridY}`;
      const existing = sizeCounts.get(sizeKey);

      if (existing) {
        existing.count += 1;
      } else {
        sizeCounts.set(sizeKey, {
          gridX: participation.gridX,
          gridY: participation.gridY,
          count: 1,
        });
      }
    }

    return {
      totalParticipatedCanvasCount: participations.length,
      totalUsedVoteCount,
      topVoterAchievedCount,
      participationCountBySize: Array.from(sizeCounts.entries())
        .map(([size, value]) => ({
          size,
          gridX: value.gridX,
          gridY: value.gridY,
          count: value.count,
        }))
        .sort((a, b) => a.gridX - b.gridX || a.gridY - b.gridY),
    };
  },
};
