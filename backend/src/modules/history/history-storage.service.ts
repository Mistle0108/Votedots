import { mkdir } from "node:fs/promises";
import path from "node:path";

const DEFAULT_STORAGE_ROOT = path.resolve(process.cwd(), "storage");
const GAME_HISTORY_PREFIX = "game-history";

export type RoundSnapshotFormat = "png" | "webp";

interface RoundSnapshotPathParams {
  capturedAt: Date;
  canvasId: number;
  roundNumber: number;
  format?: RoundSnapshotFormat;
}

function formatMonth(value: number): string {
  return String(value).padStart(2, "0");
}

function formatRoundNumber(roundNumber: number): string {
  return String(roundNumber).padStart(3, "0");
}

export function getGameHistoryStorageRoot(): string {
  return path.resolve(
    process.env.GAME_HISTORY_STORAGE_ROOT ?? DEFAULT_STORAGE_ROOT,
  );
}

export function getRoundSnapshotRelativeDirectory(
  capturedAt: Date,
  canvasId: number,
): string {
  const year = String(capturedAt.getFullYear());
  const month = formatMonth(capturedAt.getMonth() + 1);

  return path.posix.join(
    GAME_HISTORY_PREFIX,
    year,
    month,
    `canvas-${canvasId}`,
  );
}

export function getRoundSnapshotFilename(
  roundNumber: number,
  format: RoundSnapshotFormat = "png",
): string {
  return `round-${formatRoundNumber(roundNumber)}.${format}`;
}

export function buildRoundSnapshotRelativePath({
  capturedAt,
  canvasId,
  roundNumber,
  format = "png",
}: RoundSnapshotPathParams): string {
  return path.posix.join(
    getRoundSnapshotRelativeDirectory(capturedAt, canvasId),
    getRoundSnapshotFilename(roundNumber, format),
  );
}

export function resolveGameHistoryAbsolutePath(relativePath: string): string {
  return path.resolve(getGameHistoryStorageRoot(), ...relativePath.split("/"));
}

export async function ensureGameHistoryStorageRoot(): Promise<string> {
  const storageRoot = getGameHistoryStorageRoot();
  await mkdir(storageRoot, { recursive: true });
  return storageRoot;
}

export async function ensureRoundSnapshotDirectory(params: {
  capturedAt: Date;
  canvasId: number;
}): Promise<{ relativeDirPath: string; absoluteDirPath: string }> {
  const relativeDirPath = getRoundSnapshotRelativeDirectory(
    params.capturedAt,
    params.canvasId,
  );
  const absoluteDirPath = resolveGameHistoryAbsolutePath(relativeDirPath);

  await mkdir(absoluteDirPath, { recursive: true });

  return {
    relativeDirPath,
    absoluteDirPath,
  };
}
