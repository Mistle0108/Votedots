import { access } from "node:fs/promises";
import { getCanvasGameConfigSnapshot, getGameConfigSnapshot } from "../../config/game.config";
import { GAME_SIZE_ROTATION_PROFILE_KEYS } from "../../config/game-rotation.config";
import { AppDataSource } from "../../database/data-source";
import { Canvas, CanvasStatus } from "../../entities/canvas.entity";
import { GameSummary } from "../../entities/game-summary.entity";
import { roundSnapshotService } from "../history/round-snapshot.service";
import { participantSessionService } from "../participant/participant-session.service";
import { canvasService } from "../canvas/canvas.service";

const gameSummaryRepository = AppDataSource.getRepository(GameSummary);

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

function buildPublicRoundSnapshotApiPath(canvasId: number, roundId: number): string {
  return `/api/public/landing/canvas/${canvasId}/rounds/${roundId}/snapshot`;
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
    const currentCanvas = await canvasService.getCurrent();

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
};
