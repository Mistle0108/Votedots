import { access, readFile, writeFile } from "node:fs/promises";
import { AppDataSource } from "../../database/data-source";
import { Canvas } from "../../entities/canvas.entity";
import { Cell } from "../../entities/cell.entity";
import { RoundSnapshot } from "../../entities/round-snapshot.entity";
import { VoteRound } from "../../entities/vote-round.entity";
import { downloadSnapshotConfig } from "../../config/download-snapshot.config";
import {
  buildRoundDownloadRelativePath,
  buildRoundSnapshotRelativePath,
  ensureRoundDownloadDirectory,
  ensureRoundSnapshotDirectory,
  resolveGameHistoryAbsolutePath,
} from "./history-storage.service";
import { roundSnapshotRenderService } from "./round-snapshot-render.service";
import { findOutlineTemplateByAssetKey } from "../canvas/template/outline-template.service";

const canvasRepository = AppDataSource.getRepository(Canvas);
const cellRepository = AppDataSource.getRepository(Cell);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);
const roundSnapshotRepository = AppDataSource.getRepository(RoundSnapshot);
const roundDownloadSnapshotLocks = new Map<string, Promise<string>>();

interface SaveRoundSnapshotParams {
  canvasId: number;
  roundId: number;
  roundNumber: number;
  capturedAt: Date;
}

export const roundSnapshotService = {
  buildRoundSnapshotApiPath(canvasId: number, roundId: number): string {
    return `/canvas/${canvasId}/rounds/${roundId}/snapshot`;
  },

  buildRoundDownloadSnapshotApiPath(canvasId: number, roundId: number): string {
    return `/canvas/${canvasId}/rounds/${roundId}/download-snapshot`;
  },

  resolveRoundSnapshotAbsolutePath(snapshot: RoundSnapshot): string {
    return resolveGameHistoryAbsolutePath(snapshot.storagePath);
  },

  resolveRoundDownloadSnapshotAbsolutePath(
    canvasId: number,
    snapshot: RoundSnapshot,
  ): string {
    return resolveGameHistoryAbsolutePath(
      buildRoundDownloadRelativePath({
        capturedAt: snapshot.capturedAt,
        canvasId,
        roundNumber: snapshot.roundNumber,
        format: "png",
      }),
    );
  },

  async findRoundSnapshot(
    canvasId: number,
    roundId: number,
  ): Promise<RoundSnapshot | null> {
    return roundSnapshotRepository.findOne({
      where: {
        canvas: { id: canvasId },
        round: { id: roundId },
      },
    });
  },

  async findLatestRoundSnapshot(canvasId: number): Promise<RoundSnapshot | null> {
    return roundSnapshotRepository.findOne({
      where: {
        canvas: { id: canvasId },
      },
      relations: ["round"],
      order: {
        roundNumber: "DESC",
      },
    });
  },

  async getRoundSnapshot(
    canvasId: number,
    roundId: number,
  ): Promise<RoundSnapshot> {
    const snapshot = await this.findRoundSnapshot(canvasId, roundId);

    if (!snapshot) {
      throw new Error("라운드 스냅샷이 존재하지 않습니다.");
    }

    return snapshot;
  },

  async ensureRoundDownloadSnapshot(
    canvasId: number,
    snapshot: RoundSnapshot,
  ): Promise<string> {
    const absolutePath = this.resolveRoundDownloadSnapshotAbsolutePath(
      canvasId,
      snapshot,
    );

    try {
      await access(absolutePath);
      return absolutePath;
    } catch {
      const inFlight = roundDownloadSnapshotLocks.get(absolutePath);

      if (inFlight) {
        return inFlight;
      }
    }

    const generation = (async () => {
      try {
        try {
          await access(absolutePath);
          return absolutePath;
        } catch {
          await ensureRoundDownloadDirectory({
            capturedAt: snapshot.capturedAt,
          });

          const sourceBuffer = await readFile(
            this.resolveRoundSnapshotAbsolutePath(snapshot),
          );
          const downloadBuffer = downloadSnapshotConfig.enableUpscale
            ? roundSnapshotRenderService.buildDownloadPngBuffer({
                sourceBuffer,
                maxLongestSide: downloadSnapshotConfig.maxLongestSide,
              })
            : sourceBuffer;

          await writeFile(absolutePath, downloadBuffer);
          return absolutePath;
        }
      } finally {
        roundDownloadSnapshotLocks.delete(absolutePath);
      }
    })();

    roundDownloadSnapshotLocks.set(absolutePath, generation);

    return generation;
  },

  async saveRoundSnapshot({
    canvasId,
    roundId,
    roundNumber,
    capturedAt,
  }: SaveRoundSnapshotParams): Promise<RoundSnapshot> {
    const canvas = await canvasRepository.findOne({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new Error("캔버스가 존재하지 않습니다.");
    }

    const round = await voteRoundRepository.findOne({
      where: { id: roundId, canvas: { id: canvasId } },
    });

    if (!round) {
      throw new Error("라운드가 존재하지 않습니다.");
    }

    const cells = await cellRepository
      .createQueryBuilder("cell")
      .select(["cell.x", "cell.y", "cell.color"])
      .where("cell.canvas_id = :canvasId", { canvasId })
      .andWhere("cell.color IS NOT NULL")
      .getMany();

    const outlineTemplate = findOutlineTemplateByAssetKey(
      canvas.backgroundAssetKey,
    );

    const pngBuffer = roundSnapshotRenderService.renderPngBuffer({
      width: canvas.gridX,
      height: canvas.gridY,
      cells: cells.map((cell) => ({
        x: cell.x,
        y: cell.y,
        color: cell.color,
      })),
      outlineCells: outlineTemplate?.cells ?? [],
    });

    await ensureRoundSnapshotDirectory({
      capturedAt,
      canvasId,
    });

    const relativePath = buildRoundSnapshotRelativePath({
      capturedAt,
      canvasId,
      roundNumber,
      format: "png",
    });
    const absolutePath = resolveGameHistoryAbsolutePath(relativePath);

    await writeFile(absolutePath, pngBuffer);

    const existingSnapshot = await roundSnapshotRepository.findOne({
      where: {
        canvas: { id: canvasId },
        round: { id: roundId },
      },
    });

    let savedSnapshot: RoundSnapshot;

    if (existingSnapshot) {
      existingSnapshot.roundNumber = roundNumber;
      existingSnapshot.storagePath = relativePath;
      existingSnapshot.mimeType = "image/png";
      existingSnapshot.format = "png";
      existingSnapshot.width = canvas.gridX;
      existingSnapshot.height = canvas.gridY;
      existingSnapshot.byteSize = pngBuffer.byteLength;
      existingSnapshot.capturedAt = capturedAt;

      savedSnapshot = await roundSnapshotRepository.save(existingSnapshot);
    } else {
      const snapshot = roundSnapshotRepository.create({
        canvas: { id: canvasId } as Canvas,
        round: { id: roundId } as VoteRound,
        roundNumber,
        storagePath: relativePath,
        mimeType: "image/png",
        format: "png",
        width: canvas.gridX,
        height: canvas.gridY,
        byteSize: pngBuffer.byteLength,
        capturedAt,
      });

      savedSnapshot = await roundSnapshotRepository.save(snapshot);
    }

    return savedSnapshot;
  },
};
