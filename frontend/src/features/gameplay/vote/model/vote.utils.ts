import type { Cell } from "@/features/gameplay/canvas";
import {
  DEFAULT_VOTE_COLOR,
  INITIAL_SLOTS,
  SLOT_COUNT,
  STORAGE_KEYS,
} from "./vote.constants";
import type { VotePanelEntry, VotePopupEntry } from "./vote.types";

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

export function loadLastVotedColor(): string {
  if (typeof window === "undefined") {
    return DEFAULT_VOTE_COLOR;
  }

  const saved = window.localStorage.getItem(STORAGE_KEYS.lastVotedColor);
  if (!saved) {
    return DEFAULT_VOTE_COLOR;
  }

  return /^#[0-9a-fA-F]{6}$/.test(saved) ? saved : DEFAULT_VOTE_COLOR;
}

export function buildVotePopupEntries(
  votes: Record<string, number>,
  selectedCellId: number,
  cells: Cell[],
): VotePopupEntry[] {
  return Object.entries(votes)
    .filter(([key]) => key.startsWith(`${selectedCellId}:`))
    .map(([key, count]) => {
      const [cellIdStr, color] = key.split(":");
      const cellId = parseInt(cellIdStr, 10);
      const cell = cells.find((candidate) => candidate.id === cellId);

      return {
        cellId,
        x: cell?.x ?? 0,
        y: cell?.y ?? 0,
        color,
        count,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function buildVotePanelEntries(
  votes: Record<string, number>,
  cells: Cell[],
): VotePanelEntry[] {
  return Array.from(
    Object.entries(votes)
      .reduce<Map<number, VotePanelEntry>>((map, [key, count]) => {
        const [cellIdStr, color] = key.split(":");
        const cellId = parseInt(cellIdStr, 10);
        const cell = cells.find((candidate) => candidate.id === cellId);
        const existing = map.get(cellId);

        if (!existing) {
          map.set(cellId, {
            cellId,
            x: cell?.x ?? 0,
            y: cell?.y ?? 0,
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
