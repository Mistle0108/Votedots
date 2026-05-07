import { mkdir } from "node:fs/promises";
import path from "node:path";

const DEFAULT_STORAGE_ROOT = path.resolve(process.cwd(), "storage");
const GAME_HISTORY_PREFIX = "game-history";
const DOWNLOAD_PREFIX = "download";
const LANDING_PREVIEW_PREFIX = "landing-previews";

export type StorageImageFormat = "png" | "webp";

interface RoundSnapshotPathParams {
  capturedAt: Date;
  canvasId: number;
  roundNumber: number;
  format?: StorageImageFormat;
}

function formatMonth(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDay(value: number): string {
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

export function getRoundDownloadRelativeDirectory(capturedAt: Date): string {
  const year = String(capturedAt.getFullYear());
  const month = formatMonth(capturedAt.getMonth() + 1);
  const day = formatDay(capturedAt.getDate());

  return path.posix.join(DOWNLOAD_PREFIX, year, month, day);
}

export function getRoundSnapshotFilename(
  roundNumber: number,
  format: StorageImageFormat = "png",
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

export function getRoundDownloadFilename(
  canvasId: number,
  roundNumber: number,
  format: StorageImageFormat = "png",
  suffix = "",
): string {
  return `canvas-${canvasId}-${roundNumber}${suffix}.${format}`;
}

export function getLandingPreviewRelativeDirectory(endedAt: Date): string {
  const year = String(endedAt.getFullYear());
  const month = formatMonth(endedAt.getMonth() + 1);
  const day = formatDay(endedAt.getDate());

  return path.posix.join(LANDING_PREVIEW_PREFIX, year, month, day);
}

export function getLandingPreviewFilename(
  canvasId: number,
  format: StorageImageFormat = "webp",
): string {
  return `canvas-${canvasId}.${format}`;
}

export function buildLandingPreviewRelativePath(params: {
  endedAt: Date;
  canvasId: number;
  format?: StorageImageFormat;
}): string {
  const format = params.format ?? "webp";

  return path.posix.join(
    getLandingPreviewRelativeDirectory(params.endedAt),
    getLandingPreviewFilename(params.canvasId, format),
  );
}

export function buildRoundDownloadRelativePath(params: {
  capturedAt: Date;
  canvasId: number;
  roundNumber: number;
  format?: StorageImageFormat;
  suffix?: string;
}): string {
  const format = params.format ?? "png";
  const suffix = params.suffix ?? "";

  return path.posix.join(
    getRoundDownloadRelativeDirectory(params.capturedAt),
    getRoundDownloadFilename(params.canvasId, params.roundNumber, format, suffix),
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

export async function ensureRoundDownloadDirectory(params: {
  capturedAt: Date;
}): Promise<{ relativeDirPath: string; absoluteDirPath: string }> {
  const relativeDirPath = getRoundDownloadRelativeDirectory(params.capturedAt);
  const absoluteDirPath = resolveGameHistoryAbsolutePath(relativeDirPath);

  await mkdir(absoluteDirPath, { recursive: true });

  return {
    relativeDirPath,
    absoluteDirPath,
  };
}

export async function ensureLandingPreviewDirectory(params: {
  endedAt: Date;
}): Promise<{ relativeDirPath: string; absoluteDirPath: string }> {
  const relativeDirPath = getLandingPreviewRelativeDirectory(params.endedAt);
  const absoluteDirPath = resolveGameHistoryAbsolutePath(relativeDirPath);

  await mkdir(absoluteDirPath, { recursive: true });

  return {
    relativeDirPath,
    absoluteDirPath,
  };
}
