import { access, readFile, writeFile } from "node:fs/promises";
import { In } from "typeorm";
import { PNG } from "pngjs";
import { GAME_SIZE_ROTATION_PROFILE_KEYS } from "../../config/game-rotation.config";
import { getGameConfigSnapshot } from "../../config/game.config";
import { AppDataSource } from "../../database/data-source";
import {
  GamePreview,
  GamePreviewStatus,
} from "../../entities/game-preview.entity";
import { GameSummary } from "../../entities/game-summary.entity";
import {
  buildLandingPreviewRelativePath,
  ensureLandingPreviewDirectory,
  resolveGameHistoryAbsolutePath,
} from "../history/history-storage.service";
import { roundSnapshotService } from "../history/round-snapshot.service";

const WebP: any = require("../../vendor/node-webpmux/webp.js");

const gamePreviewRepository = AppDataSource.getRepository(GamePreview);
const gameSummaryRepository = AppDataSource.getRepository(GameSummary);

const PREVIEW_FRAME_COUNT = 6;
const PREVIEW_TARGET_LONGEST_SIDE = 256;
const PREVIEW_FRAME_DELAY_MS = 600;
const PREVIEW_FINAL_FRAME_MIN_DIFFERENCE_RATIO = 0.03;
const SAVE_RETRY_ATTEMPTS = 3;
const SAVE_RETRY_DELAY_MS = 250;

type GridFrameImage = {
  width: number;
  height: number;
  data: Buffer;
};

type SelectedFrame = {
  roundNumber: number;
  image: GridFrameImage;
};

export interface PublicLandingFeaturedPreviewItem {
  webpUrl: string;
  preview: {
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

export interface PublicLandingFeaturedPreviewPayload {
  items: PublicLandingFeaturedPreviewItem[];
}

function buildPreviewSize(gridX: number, gridY: number): string {
  return `${gridX}x${gridY}`;
}

function buildPublicLandingPreviewApiPath(previewId: number): string {
  return `/api/public/landing/previews/${previewId}/asset`;
}

function getAllowedPreviewSizes(): string[] {
  return Array.from(
    new Set(
      GAME_SIZE_ROTATION_PROFILE_KEYS.map((profileKey) => {
        const config = getGameConfigSnapshot(profileKey);
        return buildPreviewSize(
          config.board.gridSizeX,
          config.board.gridSizeY,
        );
      }),
    ),
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function truncateFailureReason(reason: string): string {
  return reason.length > 128 ? reason.slice(0, 128) : reason;
}

function countChangedCells(previous: GridFrameImage, next: GridFrameImage): number {
  const pixelCount = Math.min(previous.data.length, next.data.length) / 4;
  let changedCells = 0;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;

    if (
      previous.data[offset] !== next.data[offset] ||
      previous.data[offset + 1] !== next.data[offset + 1] ||
      previous.data[offset + 2] !== next.data[offset + 2] ||
      previous.data[offset + 3] !== next.data[offset + 3]
    ) {
      changedCells += 1;
    }
  }

  return changedCells;
}

function upscaleNearest(
  source: GridFrameImage,
  targetWidth: number,
  targetHeight: number,
): Buffer {
  const scaled = Buffer.alloc(targetWidth * targetHeight * 4);

  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const sourceY = Math.min(
      source.height - 1,
      Math.floor((targetY / targetHeight) * source.height),
    );

    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const sourceX = Math.min(
        source.width - 1,
        Math.floor((targetX / targetWidth) * source.width),
      );
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const targetOffset = (targetY * targetWidth + targetX) * 4;

      scaled[targetOffset] = source.data[sourceOffset];
      scaled[targetOffset + 1] = source.data[sourceOffset + 1];
      scaled[targetOffset + 2] = source.data[sourceOffset + 2];
      scaled[targetOffset + 3] = source.data[sourceOffset + 3];
    }
  }

  return scaled;
}

function calculateTargetSize(gridX: number, gridY: number): {
  width: number;
  height: number;
} {
  const longestSide = Math.max(gridX, gridY);
  const scale = PREVIEW_TARGET_LONGEST_SIDE / longestSide;

  return {
    width: Math.max(1, Math.round(gridX * scale)),
    height: Math.max(1, Math.round(gridY * scale)),
  };
}

async function ensureWebPLibInitialized(): Promise<void> {
  await WebP.Image.initLib();
}

async function loadGridFrameImage(
  canvasId: number,
  snapshot: Awaited<ReturnType<typeof roundSnapshotService.getRoundSnapshot>>,
): Promise<GridFrameImage> {
  const absolutePath = await roundSnapshotService.ensureRoundDownloadSnapshotByVariant(
    canvasId,
    snapshot,
    "grid",
  );
  const buffer = await readFile(absolutePath);
  const png = PNG.sync.read(buffer);

  return {
    width: png.width,
    height: png.height,
    data: Buffer.from(png.data),
  };
}

async function selectPreviewFrames(
  canvasId: number,
  snapshots: Awaited<ReturnType<typeof roundSnapshotService.listRoundSnapshots>>,
): Promise<SelectedFrame[]> {
  const frameCache = new Map<number, GridFrameImage>();

  const getFrameImage = async (roundNumber: number) => {
    const cached = frameCache.get(roundNumber);

    if (cached) {
      return cached;
    }

    const snapshot = snapshots.find((item) => item.roundNumber === roundNumber);

    if (!snapshot) {
      throw new Error(`Round snapshot was not found. (round=${roundNumber})`);
    }

    const image = await loadGridFrameImage(canvasId, snapshot);
    frameCache.set(roundNumber, image);
    return image;
  };

  if (snapshots.length <= PREVIEW_FRAME_COUNT) {
    return Promise.all(
      snapshots.map(async (snapshot) => ({
        roundNumber: snapshot.roundNumber,
        image: await getFrameImage(snapshot.roundNumber),
      })),
    );
  }

  const firstSnapshot = snapshots[0];
  const lastSnapshot = snapshots[snapshots.length - 1];
  const middleSnapshots = snapshots.slice(1, -1);
  const finalFrameImage = await getFrameImage(lastSnapshot.roundNumber);
  const minimumFinalFrameDifference = Math.max(
    1,
    Math.floor(finalFrameImage.width * finalFrameImage.height * PREVIEW_FINAL_FRAME_MIN_DIFFERENCE_RATIO),
  );
  const selected: SelectedFrame[] = [
    {
      roundNumber: firstSnapshot.roundNumber,
      image: await getFrameImage(firstSnapshot.roundNumber),
    },
  ];

  for (let segmentIndex = 0; segmentIndex < PREVIEW_FRAME_COUNT - 2; segmentIndex += 1) {
    const start = Math.floor(
      (middleSnapshots.length * segmentIndex) / (PREVIEW_FRAME_COUNT - 2),
    );
    const end = Math.floor(
      (middleSnapshots.length * (segmentIndex + 1)) / (PREVIEW_FRAME_COUNT - 2),
    );
    const segmentSnapshots = middleSnapshots.slice(start, Math.max(start + 1, end));
    let bestFrame: SelectedFrame | null = null;
    let preferredFrame: SelectedFrame | null = null;
    let bestScore = -1;
    let preferredScore = -1;
    const previousFrame = selected[selected.length - 1];
    const isLastMiddleSegment = segmentIndex === PREVIEW_FRAME_COUNT - 3;

    for (const snapshot of segmentSnapshots) {
      const image = await getFrameImage(snapshot.roundNumber);
      const score = countChangedCells(previousFrame.image, image);
      const finalFrameDifference = isLastMiddleSegment
        ? countChangedCells(image, finalFrameImage)
        : Number.MAX_SAFE_INTEGER;

      if (score > bestScore) {
        bestScore = score;
        bestFrame = {
          roundNumber: snapshot.roundNumber,
          image,
        };
      }

      if (
        isLastMiddleSegment &&
        finalFrameDifference >= minimumFinalFrameDifference &&
        score > preferredScore
      ) {
        preferredScore = score;
        preferredFrame = {
          roundNumber: snapshot.roundNumber,
          image,
        };
      }
    }

    if (preferredFrame) {
      selected.push(preferredFrame);
      continue;
    }

    if (bestFrame) {
      selected.push(bestFrame);
    }
  }

  selected.push({
    roundNumber: lastSnapshot.roundNumber,
    image: finalFrameImage,
  });

  return selected.filter((frame, index, frames) => {
    return frames.findIndex((item) => item.roundNumber === frame.roundNumber) === index;
  });
}

async function buildAnimatedPreviewBuffer(params: {
  gridX: number;
  gridY: number;
  frames: SelectedFrame[];
}): Promise<{ buffer: Buffer; width: number; height: number; frameCount: number }> {
  await ensureWebPLibInitialized();

  const { width, height } = calculateTargetSize(params.gridX, params.gridY);
  const frames = [];

  for (const frame of params.frames) {
    const image = await WebP.Image.getEmptyImage();
    const scaledPixels = upscaleNearest(frame.image, width, height);
    const encodeResult = await image.setImageData(scaledPixels, {
      width,
      height,
      exact: true,
      lossless: 9,
      method: 6,
    });

    if (typeof encodeResult === "number" && encodeResult !== 0) {
      throw new Error(`webp_frame_encode_failed:${encodeResult}`);
    }

    frames.push(
      await WebP.Image.generateFrame({
        img: image,
        delay: PREVIEW_FRAME_DELAY_MS,
      }),
    );
  }

  const buffer = await WebP.Image.save(null, {
    width,
    height,
    frames,
    loops: 0,
  });

  return {
    buffer,
    width,
    height,
    frameCount: params.frames.length,
  };
}

async function savePreviewEntityWithRetry(
  entityFactory: () => GamePreview,
  maxAttempts = SAVE_RETRY_ATTEMPTS,
): Promise<GamePreview> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await gamePreviewRepository.save(entityFactory());
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        await delay(SAVE_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
}

async function persistPreview(params: {
  canvasId: number;
  gameSummaryId: number;
  status: GamePreviewStatus;
  size: string;
  gridX: number;
  gridY: number;
  endedAt: Date;
  participantCount: number;
  participants: string[];
  topVoterName: string | null;
  topVoterVoteCount: number;
  totalVotes: number;
  storagePath?: string | null;
  mimeType?: string | null;
  format?: string | null;
  width?: number | null;
  height?: number | null;
  byteSize?: number | null;
  frameCount?: number | null;
  failureReason?: string | null;
}): Promise<GamePreview> {
  const existing = await gamePreviewRepository.findOne({
    where: {
      canvas: { id: params.canvasId },
    },
  });

  return savePreviewEntityWithRetry(() =>
    gamePreviewRepository.create({
      id: existing?.id,
      canvas: { id: params.canvasId },
      gameSummary: { id: params.gameSummaryId },
      status: params.status,
      storagePath: params.storagePath ?? null,
      mimeType: params.mimeType ?? null,
      format: params.format ?? null,
      width: params.width ?? null,
      height: params.height ?? null,
      byteSize: params.byteSize ?? null,
      frameCount: params.frameCount ?? null,
      size: params.size,
      gridX: params.gridX,
      gridY: params.gridY,
      endedAt: params.endedAt,
      participantCount: params.participantCount,
      participantsJson: params.participants,
      topVoterName: params.topVoterName,
      topVoterVoteCount: params.topVoterVoteCount,
      totalVotes: params.totalVotes,
      failureReason: params.failureReason ?? null,
    }),
  );
}

function serializeParticipants(summary: GameSummary): string[] {
  return (summary.participantsJson ?? []).map((participant) => participant.name);
}

export const publicLandingPreviewService = {
  async generateForGame(canvasId: number, gameSummaryId: number): Promise<void> {
    const summary = await gameSummaryRepository.findOne({
      where: {
        id: gameSummaryId,
        canvas: { id: canvasId },
      },
      relations: ["canvas"],
    });

    if (!summary || !summary.canvas.endedAt) {
      console.warn(
        `[public-landing-preview] skipped preview generation because summary/canvas was not ready (canvasId=${canvasId}, gameSummaryId=${gameSummaryId})`,
      );
      return;
    }

    const size = buildPreviewSize(summary.canvas.gridX, summary.canvas.gridY);
    const previewBase = {
      canvasId,
      gameSummaryId,
      size,
      gridX: summary.canvas.gridX,
      gridY: summary.canvas.gridY,
      endedAt: summary.canvas.endedAt,
      participantCount: summary.participantCount,
      participants: serializeParticipants(summary),
      topVoterName: summary.topVoterName,
      topVoterVoteCount: summary.topVoterVoteCount,
      totalVotes: summary.totalVotes,
    };

    try {
      const snapshots = await roundSnapshotService.listRoundSnapshots(canvasId);

      if (snapshots.length === 0) {
        throw new Error("missing_round_snapshots");
      }

      const frames = await selectPreviewFrames(canvasId, snapshots);

      if (frames.length === 0) {
        throw new Error("no_preview_frames_selected");
      }

      const rendered = await buildAnimatedPreviewBuffer({
        gridX: summary.canvas.gridX,
        gridY: summary.canvas.gridY,
        frames,
      });

      await ensureLandingPreviewDirectory({
        endedAt: summary.canvas.endedAt,
      });

      const relativePath = buildLandingPreviewRelativePath({
        endedAt: summary.canvas.endedAt,
        canvasId,
        format: "webp",
      });
      const absolutePath = resolveGameHistoryAbsolutePath(relativePath);

      await writeFile(absolutePath, rendered.buffer);

      await persistPreview({
        ...previewBase,
        status: GamePreviewStatus.READY,
        storagePath: relativePath,
        mimeType: "image/webp",
        format: "webp",
        width: rendered.width,
        height: rendered.height,
        byteSize: rendered.buffer.byteLength,
        frameCount: rendered.frameCount,
        failureReason: null,
      });
    } catch (error) {
      console.error(
        `[public-landing-preview] failed to generate preview (canvasId=${canvasId}, gameSummaryId=${gameSummaryId}):`,
        error,
      );

      await persistPreview({
        ...previewBase,
        status: GamePreviewStatus.FAILED,
        failureReason: truncateFailureReason(
          error instanceof Error ? error.message : String(error),
        ),
      });
    }
  },

  async getFeaturedPreviewPayload(): Promise<PublicLandingFeaturedPreviewPayload> {
    const allowedSizes = getAllowedPreviewSizes();
    const previews = await gamePreviewRepository.find({
      where: {
        status: GamePreviewStatus.READY,
        size: In(allowedSizes),
      },
      order: {
        participantCount: "DESC",
        endedAt: "DESC",
      },
    });

    const previewBySize = new Map<string, GamePreview>();

    for (const size of allowedSizes) {
      const preview = previews.find((item) => item.size === size);

      if (preview) {
        previewBySize.set(size, preview);
      }
    }

    const items = allowedSizes
      .map((size) => previewBySize.get(size))
      .filter((preview): preview is GamePreview => Boolean(preview))
      .map((preview) => ({
        webpUrl: buildPublicLandingPreviewApiPath(preview.id),
        preview: {
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
      }));

    return {
      items,
    };
  },

  async getPreviewAbsolutePath(
    previewId: number,
  ): Promise<{ absolutePath: string; mimeType: string }> {
    const preview = await gamePreviewRepository.findOne({
      where: {
        id: previewId,
        status: GamePreviewStatus.READY,
      },
    });

    if (!preview?.storagePath || !preview.mimeType) {
      throw new Error("Preview was not found.");
    }

    const absolutePath = resolveGameHistoryAbsolutePath(preview.storagePath);

    await access(absolutePath);

    return {
      absolutePath,
      mimeType: preview.mimeType,
    };
  },
};
