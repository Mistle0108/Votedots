import { access, readFile, writeFile } from "node:fs/promises";
import { AppDataSource } from "../../database/data-source";
import { Canvas } from "../../entities/canvas.entity";
import { Cell } from "../../entities/cell.entity";
import { GameSummary } from "../../entities/game-summary.entity";
import { downloadSnapshotConfig } from "../../config/download-snapshot.config";
import {
  buildGameResultRelativePath,
  buildGameResultDownloadRelativePath,
  ensureGameResultDirectory,
  ensureRoundDownloadDirectory,
  resolveGameHistoryAbsolutePath,
} from "./history-storage.service";
import { roundSnapshotRenderService } from "./round-snapshot-render.service";
import {
  loadResultTemplateAsset,
  resolveResultTemplateAssetKey,
} from "../canvas/template/result-template.service";

const canvasRepository = AppDataSource.getRepository(Canvas);
const cellRepository = AppDataSource.getRepository(Cell);
const gameSummaryRepository = AppDataSource.getRepository(GameSummary);
const finalResultDownloadLocks = new Map<string, Promise<string>>();

type FinalResultDownloadVariant = "original" | "hd";

export const finalResultImageService = {
  buildFinalResultImageApiPath(canvasId: number): string {
    return `/api/public/canvas/${canvasId}/final-result`;
  },

  buildFinalResultDownloadApiPath(canvasId: number): string {
    return this.buildFinalResultImageApiPath(canvasId);
  },

  buildFinalResultHighResolutionDownloadApiPath(canvasId: number): string {
    return `/api/public/canvas/${canvasId}/final-result/download-hd`;
  },

  resolveFinalResultAbsolutePath(summary: Pick<GameSummary, "finalResultStoragePath">): string {
    if (!summary.finalResultStoragePath) {
      throw new Error("Final result image was not found.");
    }

    return resolveGameHistoryAbsolutePath(summary.finalResultStoragePath);
  },

  async getFinalResultAsset(canvasId: number): Promise<{
    absolutePath: string;
    mimeType: string;
  }> {
    const gameSummary = await gameSummaryRepository
      .createQueryBuilder("summary")
      .where("summary.canvas_id = :canvasId", { canvasId })
      .getOne();

    if (!gameSummary?.finalResultStoragePath) {
      throw new Error("Final result image was not found.");
    }

    return {
      absolutePath: this.resolveFinalResultAbsolutePath(gameSummary),
      mimeType: gameSummary.finalResultMimeType ?? "image/png",
    };
  },

  async ensureFinalResultDownloadAsset(
    canvasId: number,
    variant: FinalResultDownloadVariant,
  ): Promise<{
    absolutePath: string;
    mimeType: string;
  }> {
    const gameSummary = await gameSummaryRepository
      .createQueryBuilder("summary")
      .where("summary.canvas_id = :canvasId", { canvasId })
      .getOne();

    if (!gameSummary?.finalResultStoragePath) {
      throw new Error("Final result image was not found.");
    }

    if (variant === "original") {
      return {
        absolutePath: this.resolveFinalResultAbsolutePath(gameSummary),
        mimeType: gameSummary.finalResultMimeType ?? "image/png",
      };
    }

    const capturedAt =
      gameSummary.finalResultCapturedAt ??
      gameSummary.updatedAt ??
      gameSummary.createdAt ??
      new Date();
    const relativePath = buildGameResultDownloadRelativePath({
      capturedAt,
      canvasId,
      format: "png",
      suffix: "-hd",
    });
    const absolutePath = resolveGameHistoryAbsolutePath(relativePath);

    try {
      await access(absolutePath);

      return {
        absolutePath,
        mimeType: gameSummary.finalResultMimeType ?? "image/png",
      };
    } catch {
      const inFlight = finalResultDownloadLocks.get(absolutePath);

      if (inFlight) {
        await inFlight;

        return {
          absolutePath,
          mimeType: gameSummary.finalResultMimeType ?? "image/png",
        };
      }
    }

    const generation = (async () => {
      try {
        try {
          await access(absolutePath);
          return absolutePath;
        } catch {
          await ensureRoundDownloadDirectory({ capturedAt });

          const sourceBuffer = await readFile(
            this.resolveFinalResultAbsolutePath(gameSummary),
          );
          const downloadBuffer = roundSnapshotRenderService.buildDownloadPngBuffer({
            sourceBuffer,
            maxLongestSide: downloadSnapshotConfig.maxLongestSide,
          });

          await writeFile(absolutePath, downloadBuffer);
          return absolutePath;
        }
      } finally {
        finalResultDownloadLocks.delete(absolutePath);
      }
    })();

    finalResultDownloadLocks.set(absolutePath, generation);
    await generation;

    return {
      absolutePath,
      mimeType: gameSummary.finalResultMimeType ?? "image/png",
    };
  },

  async saveForCanvas(canvasId: number): Promise<void> {
    const canvas = await canvasRepository.findOne({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new Error(`Canvas was not found. (id=${canvasId})`);
    }

    const gameSummary = await gameSummaryRepository
      .createQueryBuilder("summary")
      .where("summary.canvas_id = :canvasId", { canvasId })
      .getOne();

    if (!gameSummary) {
      throw new Error(`Game summary was not found. (canvasId=${canvasId})`);
    }

    const cells = await cellRepository
      .createQueryBuilder("cell")
      .select(["cell.x", "cell.y", "cell.color"])
      .where("cell.canvas_id = :canvasId", { canvasId })
      .andWhere("cell.color IS NOT NULL")
      .getMany();

    const resultTemplateAssetKey = resolveResultTemplateAssetKey({
      resultTemplateAssetKey: canvas.resultTemplateAssetKey,
    });
    const resultTemplateImageBuffer =
      await loadResultTemplateAsset(resultTemplateAssetKey);
    const capturedAt = canvas.endedAt ?? new Date();

    const renderedSnapshot = roundSnapshotRenderService.renderPngBuffer({
      gridWidth: canvas.gridX,
      gridHeight: canvas.gridY,
      cells: cells.map((cell) => ({
        x: cell.x,
        y: cell.y,
        color: cell.color,
      })),
      backgroundImageBuffer: resultTemplateImageBuffer,
    });

    await ensureGameResultDirectory({
      capturedAt,
      canvasId,
    });

    const relativePath = buildGameResultRelativePath({
      capturedAt,
      canvasId,
      format: "png",
    });
    const absolutePath = resolveGameHistoryAbsolutePath(relativePath);

    await writeFile(absolutePath, renderedSnapshot.buffer);

    gameSummary.finalResultStoragePath = relativePath;
    gameSummary.finalResultMimeType = "image/png";
    gameSummary.finalResultFormat = "png";
    gameSummary.finalResultWidth = renderedSnapshot.imageWidth;
    gameSummary.finalResultHeight = renderedSnapshot.imageHeight;
    gameSummary.finalResultByteSize = renderedSnapshot.buffer.byteLength;
    gameSummary.finalResultCapturedAt = capturedAt;

    await gameSummaryRepository.save(gameSummary);
  },
};
