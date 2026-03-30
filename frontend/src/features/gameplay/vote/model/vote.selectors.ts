import { Cell } from "@/features/gameplay/canvas";
import { VoteBoardEntry, VoteEntry } from "./vote.types";

export function getVoteEntriesForCell(
  votes: Record<string, number>,
  selectedCellId: number,
  cells: Cell[],
): VoteEntry[] {
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

export function getVoteBoardEntries(
  votes: Record<string, number>,
  cells: Cell[],
): VoteBoardEntry[] {
  return Array.from(
    Object.entries(votes)
      .reduce<Map<number, VoteBoardEntry>>((map, [key, count]) => {
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

export function getVotingCellState(votes: Record<string, number>) {
  const votingCellIds = new Set<number>();
  const countMap = new Map<number, { color: string; count: number }>();

  for (const [key, count] of Object.entries(votes)) {
    const [cellIdStr, color] = key.split(":");
    const cellId = parseInt(cellIdStr, 10);

    votingCellIds.add(cellId);

    const existing = countMap.get(cellId);
    if (!existing || count > existing.count) {
      countMap.set(cellId, { color, count });
    }
  }

  const topColorMap = new Map<number, string>();
  countMap.forEach(({ color }, cellId) => {
    topColorMap.set(cellId, color);
  });

  return {
    votingCellIds,
    topColorMap,
  };
}
