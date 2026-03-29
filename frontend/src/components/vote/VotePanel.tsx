import RoundInfo from "./RoundInfo";
import MiniMap from "./MiniMap";
import CoordinateNavigator from "./CoordinateNavigator";
import { Cell } from "@/types/canvas";

const VOTES_PER_ROUND = parseInt(import.meta.env.VITE_VOTES_PER_ROUND ?? "3");
const MAX_ENTRIES = 5;

interface VoteEntry {
  cellId: number;
  x: number;
  y: number;
  topColor: string;
  topCount: number;
  totalCount: number;
}

interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  roundNumber: number | null;
  totalRounds: number;
  formattedGameEndTime: string | null;
  formattedRemainingTime: string | null;
  remainingSeconds: number | null;
  roundDurationSec: number | null;
  votes: Record<string, number>;
  remaining: number | null;
  cells: Cell[];
  gridX: number;
  gridY: number;
  selectedCell: Cell | null;
  viewport: Viewport | null;
  onNavigateToCoordinate: (x: number, y: number) => void;
}

export default function VotePanel({
  roundNumber,
  totalRounds,
  formattedGameEndTime,
  formattedRemainingTime,
  remainingSeconds,
  roundDurationSec,
  votes,
  remaining,
  cells,
  gridX,
  gridY,
  selectedCell,
  viewport,
  onNavigateToCoordinate,
}: Props) {
  const voteEntries: VoteEntry[] = Array.from(
    Object.entries(votes)
      .reduce<Map<number, VoteEntry>>((map, [key, count]) => {
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
  )
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, MAX_ENTRIES);

  const maxCount = voteEntries[0]?.totalCount ?? 1;
  const usedCount = remaining !== null ? VOTES_PER_ROUND - remaining : 0;
  const slots = Array.from({ length: MAX_ENTRIES }).map(
    (_, index) => voteEntries[index] ?? null,
  );

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      <h2 className="text-lg font-bold">VoteDots</h2>

      <RoundInfo
        roundNumber={roundNumber}
        totalRounds={totalRounds}
        formattedGameEndTime={formattedGameEndTime}
        formattedRemainingTime={formattedRemainingTime}
        remainingSeconds={remainingSeconds}
        roundDurationSec={roundDurationSec}
      />

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">남은 투표권</p>
        <div className="flex gap-1">
          {remaining !== null ? (
            Array.from({ length: VOTES_PER_ROUND }).map((_, index) => (
              <span
                key={index}
                className={`text-lg ${
                  index < usedCount ? "text-gray-300" : "text-blue-500"
                }`}
              >
                ●
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      </div>

      <MiniMap
        cells={cells}
        gridX={gridX}
        gridY={gridY}
        viewport={viewport}
        selectedCell={selectedCell}
        onNavigate={onNavigateToCoordinate}
      />

      <CoordinateNavigator
        gridX={gridX}
        gridY={gridY}
        selectedX={selectedCell?.x ?? null}
        selectedY={selectedCell?.y ?? null}
        onNavigate={onNavigateToCoordinate}
      />

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">득표 현황</p>
        <div className="flex flex-col gap-1.5 rounded border border-red-400 p-2">
          {slots.map((entry, index) => (
            <div key={index} className="flex h-5 items-center gap-2">
              {entry ? (
                <>
                  <div
                    className="h-3 w-3 shrink-0 rounded-sm border border-gray-200"
                    style={{ backgroundColor: entry.topColor }}
                  />
                  <span className="w-16 shrink-0 text-xs text-gray-500">
                    ({entry.x}, {entry.y})
                  </span>
                  <div className="h-2 flex-1 rounded bg-gray-100">
                    <div
                      className="h-2 rounded"
                      style={{
                        width: `${(entry.topCount / maxCount) * 100}%`,
                        backgroundColor: entry.topColor,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs text-gray-500">
                    {entry.topCount}/{entry.totalCount}
                  </span>
                </>
              ) : (
                <div className="h-2 w-full rounded bg-gray-50" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
