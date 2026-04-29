import type { Cell } from "@/features/gameplay/canvas";
import {
  DEFAULT_VOTE_COLOR,
  INITIAL_SLOTS,
  SLOT_COUNT,
  STORAGE_KEYS,
} from "./vote.constants";
import type { VotePanelEntry } from "./vote.types";

export function loadSlotColors(): string[] {
  if (typeof window === "undefined") {
    return INITIAL_SLOTS;
  }

  const saved = window.localStorage.getItem(STORAGE_KEYS.slotColors);
  if (!saved) {
    return INITIAL_SLOTS;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return INITIAL_SLOTS;
    }

    const normalized = parsed
      .slice(0, SLOT_COUNT)
      .map((value) => (typeof value === "string" ? value : ""));

    while (normalized.length < SLOT_COUNT) {
      normalized.push("");
    }

    return normalized;
  } catch {
    return INITIAL_SLOTS;
  }
}

export function loadLastPaletteColor(): string {
  if (typeof window === "undefined") {
    return DEFAULT_VOTE_COLOR;
  }

  const saved = window.localStorage.getItem(STORAGE_KEYS.lastPaletteColor);
  if (!saved) {
    return DEFAULT_VOTE_COLOR;
  }

  return /^#[0-9a-fA-F]{6}$/.test(saved) ? saved : DEFAULT_VOTE_COLOR;
}

// TO-BE
export function buildVotePopupEntries(
  votes: Record<string, number>,
  x: number,
  y: number,
  cells: Cell[],
) {
  const counts = new Map<string, number>();

  Object.entries(votes).forEach(([key, count]) => {
    const [targetX, targetY, color] = key.split(":");

    if (Number(targetX) !== x || Number(targetY) !== y || !color) {
      return;
    }

    counts.set(color, count);
  });

  const selectedCell = cells.find((cell) => cell.x === x && cell.y === y);

  if (selectedCell?.color) {
    counts.set(selectedCell.color, counts.get(selectedCell.color) ?? 0);
  }

  return [...counts.entries()]
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildVotePanelEntries(
  votes: Record<string, number>,
  cells: Cell[],
): VotePanelEntry[] {
  return Array.from(
    Object.entries(votes)
      .reduce<Map<string, VotePanelEntry>>((map, [key, count]) => {
        const [xStr, yStr, color] = key.split(":");
        const x = parseInt(xStr, 10);
        const y = parseInt(yStr, 10);
        const coordinateKey = `${x}:${y}`;
        const cell = cells.find(
          (candidate) => candidate.x === x && candidate.y === y,
        );
        const existing = map.get(coordinateKey);

        if (!existing) {
          map.set(coordinateKey, {
            x: cell?.x ?? x,
            y: cell?.y ?? y,
            topColor: color,
            topCount: count,
            totalCount: count,
          });
        } else {
          existing.totalCount += count;

          if (count > existing.topCount) {
            existing.topColor = color;
            existing.topCount = count;
          }
        }

        return map;
      }, new Map())
      .values(),
  ).sort((a, b) => b.totalCount - a.totalCount);
}
