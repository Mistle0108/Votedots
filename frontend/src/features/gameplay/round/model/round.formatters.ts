export function getRoundProgressPercent(
  remainingSeconds: number | null,
  roundDurationSec: number | null,
): number {
  if (
    remainingSeconds === null ||
    roundDurationSec === null ||
    roundDurationSec <= 0
  ) {
    return 0;
  }

  return (remainingSeconds / roundDurationSec) * 100;
}

export function formatClockTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}
