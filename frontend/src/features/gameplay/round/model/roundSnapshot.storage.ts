const LATEST_ROUND_SNAPSHOT_KEY = "latest-round-snapshot";
const LATEST_ROUND_NUMBER_KEY = "latest-round-number";

export interface LatestRoundSnapshot {
  roundNumber: number | null;
  snapshot: string | null;
}

export function getLatestRoundSnapshot(): LatestRoundSnapshot {
  try {
    const snapshot = window.localStorage.getItem(LATEST_ROUND_SNAPSHOT_KEY);
    const roundNumberRaw = window.localStorage.getItem(LATEST_ROUND_NUMBER_KEY);

    return {
      snapshot,
      roundNumber: roundNumberRaw ? Number(roundNumberRaw) : null,
    };
  } catch {
    return {
      snapshot: null,
      roundNumber: null,
    };
  }
}

export function setLatestRoundSnapshot(
  roundNumber: number,
  snapshot: string,
): boolean {
  try {
    window.localStorage.setItem(LATEST_ROUND_SNAPSHOT_KEY, snapshot);
    window.localStorage.setItem(LATEST_ROUND_NUMBER_KEY, String(roundNumber));
    return true;
  } catch {
    return false;
  }
}

export function clearLatestRoundSnapshot(): void {
  try {
    window.localStorage.removeItem(LATEST_ROUND_SNAPSHOT_KEY);
    window.localStorage.removeItem(LATEST_ROUND_NUMBER_KEY);
  } catch {
    // no-op
  }
}

export { LATEST_ROUND_SNAPSHOT_KEY, LATEST_ROUND_NUMBER_KEY };
