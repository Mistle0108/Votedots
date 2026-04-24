const SNAPSHOT_DOWNLOAD_TIME_ZONE = "Asia/Seoul";

export interface SnapshotDownloadMeta {
  snapshotUrl?: string | null;
  canvasId?: number | null;
  endedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  fileNameSuffix?: string | null;
}

function getDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SNAPSHOT_DOWNLOAD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("날짜 포맷을 생성할 수 없습니다.");
  }

  return { year, month, day };
}

function resolveSnapshotDate(meta: SnapshotDownloadMeta) {
  const dateSource = meta.endedAt ?? meta.createdAt ?? meta.updatedAt;

  if (!dateSource) {
    return new Date();
  }

  const parsedDate = new Date(dateSource);

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
}

export function canDownloadSnapshot(meta: SnapshotDownloadMeta) {
  return Boolean(meta.snapshotUrl);
}

export function getSnapshotDownloadFileName(meta: SnapshotDownloadMeta) {
  if (!meta.canvasId) {
    throw new Error("canvasId가 없어 파일명을 생성할 수 없습니다.");
  }

  const { year, month, day } = getDateParts(resolveSnapshotDate(meta));
  const suffix = meta.fileNameSuffix ?? "";
  return `${year}${month}${day}-${meta.canvasId}${suffix}.png`;
}
