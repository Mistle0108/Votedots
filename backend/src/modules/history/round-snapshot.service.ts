import { writeFile } from "node:fs/promises";
import { AppDataSource } from "../../database/data-source";
import { Canvas } from "../../entities/canvas.entity";
import { Cell } from "../../entities/cell.entity";
import { RoundSnapshot } from "../../entities/round-snapshot.entity";
import { VoteRound } from "../../entities/vote-round.entity";
import {
  buildRoundSnapshotRelativePath,
  ensureRoundSnapshotDirectory,
  resolveGameHistoryAbsolutePath,
} from "./history-storage.service";
import { roundSnapshotRenderService } from "./round-snapshot-render.service";

const canvasRepository = AppDataSource.getRepository(Canvas);
const cellRepository = AppDataSource.getRepository(Cell);
const voteRoundRepository = AppDataSource.getRepository(VoteRound);
const roundSnapshotRepository = AppDataSource.getRepository(RoundSnapshot);

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

  resolveRoundSnapshotAbsolutePath(snapshot: RoundSnapshot): string {
    return resolveGameHistoryAbsolutePath(snapshot.storagePath);
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

    const pngBuffer = roundSnapshotRenderService.renderPngBuffer({
      width: canvas.gridX,
      height: canvas.gridY,
      cells: cells.map((cell) => ({
        x: cell.x,
        y: cell.y,
        color: cell.color,
      })),
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
