import { access } from "node:fs/promises";
import { getCanvasGameConfigSnapshot, getGameConfigSnapshot } from "../../config/game.config";
import { GAME_SIZE_ROTATION_PROFILE_KEYS } from "../../config/game-rotation.config";
import { AppDataSource } from "../../database/data-source";
import { Canvas, CanvasStatus } from "../../entities/canvas.entity";
import {
  GamePreview,
  GamePreviewStatus,
} from "../../entities/game-preview.entity";
import { GameSummary } from "../../entities/game-summary.entity";
import { Room, RoomType } from "../../entities/room.entity";
import { roundSnapshotService } from "../history/round-snapshot.service";
import { participantSessionService } from "../participant/participant-session.service";
import { canvasService } from "../canvas/canvas.service";
import { finalResultImageService } from "../history/final-result-image.service";

const gameSummaryRepository = AppDataSource.getRepository(GameSummary);
const gamePreviewRepository = AppDataSource.getRepository(GamePreview);

type FeaturedProfileKey = (typeof GAME_SIZE_ROTATION_PROFILE_KEYS)[number];

export interface PublicLandingCurrentGame {
  canvasId: number;
  gridX: number;
  gridY: number;
  currentRoundNumber: number;
  totalRounds: number;
  participantCount: number;
  snapshotUrl: string | null;
  fallbackImageUrl: string | null;
}

export interface PublicLandingFeaturedGameCard {
  profileKey: FeaturedProfileKey;
  gridX: number;
  gridY: number;
  state: "empty" | "ready";
  fallbackImageUrl: string | null;
  game: {
    canvasId: number;
    totalRounds: number;
    participantCount: number;
    totalVotes: number;
    canvasCompletionPercent: string;
    topVoterName: string | null;
    topVoterVoteCount: number;
    topVoters: GameSummary["topVotersJson"];
    participants: GameSummary["participantsJson"];
    endedAt: string | null;
    snapshotUrl: string | null;
  } | null;
}

export interface PublicLandingPayload {
  currentGame: PublicLandingCurrentGame | null;
  featuredGames: PublicLandingFeaturedGameCard[];
}

export interface PublicLandingCompletedPreviewItem {
  webpUrl: string;
  resultImageUrl: string | null;
  downloadAvailable: boolean;
  downloadSnapshotUrl: string | null;
  highResolutionDownloadSnapshotUrl: string | null;
  preview: {
    canvasId: number;
    size: string;
    gridX: number;
    gridY: number;
    endedAt: string;
    participantCount: number;
    participants: string[];
    topVoter: {
      name: string | null;
      voteCount: number;
    };
    totalVotes: number;
  };
}

export interface PublicLandingCompletedPreviewsPayload {
  items: PublicLandingCompletedPreviewItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export interface PublicLandingCompletedDetailPayload {
  canvasId: number;
  size: string;
  endedAt: string;
  totalRounds: number;
  participantCount: number;
  totalVotes: number;
  topVoterName: string | null;
  topVoterVoteCount: number;
  participants: string[];
  resultImageUrl: string | null;
  downloadAvailable: boolean;
  highResolutionDownloadAvailable: boolean;
  downloadSnapshotUrl: string | null;
  highResolutionDownloadSnapshotUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

function buildPublicRoundSnapshotApiPath(canvasId: number, roundId: number): string {
  return `/api/public/landing/canvas/${canvasId}/rounds/${roundId}/snapshot`;
}

function buildPublicLandingPreviewApiPath(previewId: number): string {
  return `/api/public/landing/previews/${previewId}/asset`;
}

function getAssetSizeFolder(assetKey: string): string | null {
  const matched = assetKey.match(/-(\d+x\d+)$/);
  const sizeFolder = matched?.[1] ?? null;

  return sizeFolder || null;
}

function buildResultTemplateImageUrl(assetKey: string | null): string | null {
  if (!assetKey) {
    return null;
  }

  const sizeFolder = getAssetSizeFolder(assetKey);

  if (sizeFolder) {
    return `/result-templates/${sizeFolder}/${assetKey}.png`;
  }

  return `/result-templates/${assetKey}.png`;
}

function buildDefaultResultTemplateAssetKey(gridX: number, gridY: number): string {
  return `empty-${gridX}x${gridY}`;
}

function resolveFallbackImageUrl(canvasLike: {
  gridX: number;
  gridY: number;
  resultTemplateAssetKey?: string | null;
}): string | null {
  return buildResultTemplateImageUrl(
    canvasLike.resultTemplateAssetKey ??
      buildDefaultResultTemplateAssetKey(canvasLike.gridX, canvasLike.gridY),
  );
}

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function serializeFeaturedGame(
  profileKey: FeaturedProfileKey,
  summary: GameSummary | null,
  snapshotUrl: string | null,
): PublicLandingFeaturedGameCard {
  const profileConfig = getGameConfigSnapshot(profileKey);
  const gridX = profileConfig.board.gridSizeX;
  const gridY = profileConfig.board.gridSizeY;

  if (!summary) {
    return {
      profileKey,
      gridX,
      gridY,
      state: "empty",
      fallbackImageUrl: resolveFallbackImageUrl({ gridX, gridY }),
      game: null,
    };
  }

  return {
    profileKey,
    gridX,
    gridY,
    state: "ready",
    fallbackImageUrl: resolveFallbackImageUrl({
      gridX,
      gridY,
      resultTemplateAssetKey: summary.canvas.resultTemplateAssetKey,
    }),
    game: {
      canvasId: summary.canvas.id,
      totalRounds: summary.totalRounds,
      participantCount: summary.participantCount,
      totalVotes: summary.totalVotes,
      canvasCompletionPercent: summary.canvasCompletionPercent,
      topVoterName: summary.topVoterName,
      topVoterVoteCount: summary.topVoterVoteCount,
      topVoters: summary.topVotersJson,
      participants: summary.participantsJson,
      endedAt: toIsoString(summary.canvas.endedAt),
      snapshotUrl,
    },
  };
}

async function resolveSnapshotUrl(canvasId: number): Promise<string | null> {
  const latestSnapshot = await roundSnapshotService.findLatestRoundSnapshot(canvasId);
  const roundId = latestSnapshot?.round?.id;

  if (!roundId) {
    return null;
  }

  return buildPublicRoundSnapshotApiPath(canvasId, roundId);
}

async function getFeaturedSummary(
  profileKey: FeaturedProfileKey,
): Promise<GameSummary | null> {
  return gameSummaryRepository
    .createQueryBuilder("summary")
    .innerJoinAndSelect("summary.canvas", "canvas")
    .where("canvas.configProfileKey = :profileKey", { profileKey })
    .andWhere("canvas.status = :status", { status: CanvasStatus.FINISHED })
    .andWhere("canvas.endedAt IS NOT NULL")
    .orderBy("summary.participantCount", "DESC")
    .addOrderBy("canvas.endedAt", "DESC")
    .getOne();
}

export const publicLandingService = {
  async getLandingPayload(): Promise<PublicLandingPayload> {
    const currentCanvas = await canvasService.getCurrentPlaza();

    const [currentGame, featuredGames] = await Promise.all([
      this.getCurrentGame(currentCanvas),
      Promise.all(
        GAME_SIZE_ROTATION_PROFILE_KEYS.map(async (profileKey) => {
          const summary = await getFeaturedSummary(profileKey);
          const snapshotUrl = summary
            ? await resolveSnapshotUrl(summary.canvas.id)
            : null;

          return serializeFeaturedGame(profileKey, summary, snapshotUrl);
        }),
      ),
    ]);

    return {
      currentGame,
      featuredGames,
    };
  },

  async getCurrentGame(canvas: Canvas | null): Promise<PublicLandingCurrentGame | null> {
    if (!canvas) {
      return null;
    }

    const config = getCanvasGameConfigSnapshot(canvas);
    const [snapshotUrl, participantCount] = await Promise.all([
      resolveSnapshotUrl(canvas.id),
      canvas.status === CanvasStatus.PLAYING
        ? participantSessionService.getParticipantCount(canvas.id)
        : gameSummaryRepository
            .findOne({
              where: { canvas: { id: canvas.id } },
            })
            .then((summary) => summary?.participantCount ?? 0),
    ]);

    return {
      canvasId: canvas.id,
      gridX: canvas.gridX,
      gridY: canvas.gridY,
      currentRoundNumber: canvas.currentRoundNumber,
      totalRounds: config.rules.totalRounds,
      participantCount,
      snapshotUrl,
      fallbackImageUrl: resolveFallbackImageUrl(canvas),
    };
  },

  async getRoundSnapshotAbsolutePath(
    canvasId: number,
    roundId: number,
  ): Promise<{ absolutePath: string; mimeType: string }> {
    const snapshot = await roundSnapshotService.getRoundSnapshot(canvasId, roundId);
    const absolutePath = roundSnapshotService.resolveRoundSnapshotAbsolutePath(snapshot);

    await access(absolutePath);

    return {
      absolutePath,
      mimeType: snapshot.mimeType,
    };
  },

  async getCompletedPreviews(params: {
    scope: "plaza" | "public";
    dateFrom: Date;
    dateTo: Date;
    page: number;
    limit: number;
    sort: "latest" | "oldest";
  }): Promise<PublicLandingCompletedPreviewsPayload> {
    const query = gamePreviewRepository
      .createQueryBuilder("preview")
      .innerJoinAndSelect("preview.canvas", "canvas")
      .leftJoinAndSelect("preview.gameSummary", "gameSummary")
      .leftJoin(Room, "room", "room.canvas_id = canvas.id")
      .where("preview.status = :status", { status: GamePreviewStatus.READY })
      .andWhere("preview.endedAt >= :dateFrom", { dateFrom: params.dateFrom })
      .andWhere("preview.endedAt <= :dateTo", { dateTo: params.dateTo });

    if (params.scope === "plaza") {
      query.andWhere("(room.id IS NULL OR room.type = :plazaType)", {
        plazaType: RoomType.PLAZA,
      });
    } else {
      query.andWhere("room.type = :publicType", {
        publicType: RoomType.PUBLIC,
      });
    }

    const totalItems = await query.clone().getCount();
    const previews = await query
      .orderBy(
        "preview.endedAt",
        params.sort === "oldest" ? "ASC" : "DESC",
      )
      .addOrderBy("preview.id", params.sort === "oldest" ? "ASC" : "DESC")
      .offset((params.page - 1) * params.limit)
      .limit(params.limit)
      .getMany();
    const totalPages = Math.max(1, Math.ceil(totalItems / params.limit));

    return {
      items: previews.map((preview) => ({
        webpUrl: buildPublicLandingPreviewApiPath(preview.id),
        resultImageUrl: preview.gameSummary?.finalResultStoragePath
          ? finalResultImageService.buildFinalResultImageApiPath(preview.canvas.id)
          : null,
        downloadAvailable: Boolean(preview.gameSummary?.finalResultStoragePath),
        downloadSnapshotUrl: preview.gameSummary?.finalResultStoragePath
          ? finalResultImageService.buildFinalResultDownloadApiPath(
              preview.canvas.id,
            )
          : null,
        highResolutionDownloadSnapshotUrl: preview.gameSummary
          ?.finalResultStoragePath
          ? finalResultImageService.buildFinalResultHighResolutionDownloadApiPath(
              preview.canvas.id,
            )
          : null,
        preview: {
          canvasId: preview.canvas.id,
          size: preview.size,
          gridX: preview.gridX,
          gridY: preview.gridY,
          endedAt: preview.endedAt.toISOString(),
          participantCount: preview.participantCount,
          participants: preview.participantsJson ?? [],
          topVoter: {
            name: preview.topVoterName,
            voteCount: preview.topVoterVoteCount,
          },
          totalVotes: preview.totalVotes,
        },
      })),
      pagination: {
        page: params.page,
        limit: params.limit,
        totalItems,
        totalPages,
        hasNextPage: params.page < totalPages,
      },
    };
  },

  async getCompletedPreviewDetail(
    canvasId: number,
  ): Promise<PublicLandingCompletedDetailPayload | null> {
    const summary = await gameSummaryRepository
      .createQueryBuilder("summary")
      .innerJoinAndSelect("summary.canvas", "canvas")
      .where("summary.canvas_id = :canvasId", { canvasId })
      .andWhere("canvas.status = :status", { status: CanvasStatus.FINISHED })
      .andWhere("canvas.endedAt IS NOT NULL")
      .getOne();

    if (!summary || !summary.canvas.endedAt) {
      return null;
    }

    const hasFinalResultImage = Boolean(summary.finalResultStoragePath);

    return {
      canvasId: summary.canvas.id,
      size: `${summary.canvas.gridX}x${summary.canvas.gridY}`,
      endedAt: summary.canvas.endedAt.toISOString(),
      totalRounds: summary.totalRounds,
      participantCount: summary.participantCount,
      totalVotes: summary.totalVotes,
      topVoterName: summary.topVoterName,
      topVoterVoteCount: summary.topVoterVoteCount,
      participants: (summary.participantsJson ?? []).map(
        (participant) => participant.name,
      ),
      resultImageUrl: hasFinalResultImage
        ? finalResultImageService.buildFinalResultImageApiPath(canvasId)
        : null,
      downloadAvailable: hasFinalResultImage,
      highResolutionDownloadAvailable: hasFinalResultImage,
      downloadSnapshotUrl: hasFinalResultImage
        ? finalResultImageService.buildFinalResultDownloadApiPath(canvasId)
        : null,
      highResolutionDownloadSnapshotUrl: hasFinalResultImage
        ? finalResultImageService.buildFinalResultHighResolutionDownloadApiPath(
            canvasId,
          )
        : null,
      createdAt: summary.createdAt.toISOString(),
      updatedAt: summary.updatedAt.toISOString(),
    };
  },
};
