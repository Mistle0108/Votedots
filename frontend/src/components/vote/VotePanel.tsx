import RoundInfo from "./RoundInfo";

const VOTES_PER_ROUND = parseInt(import.meta.env.VITE_VOTES_PER_ROUND ?? "3");
const MAX_ENTRIES = 5;

interface VoteEntry {
  cellId: number;
  x: number;
  y: number;
  topColor: string;   // color → topColor (1위 색상)
  topCount: number;   // 1위 색상 득표수
  totalCount: number; // 해당 셀 전체 득표수
}

interface Cell {
  id: number;
  x: number;
  y: number;
}

interface Props {
  roundId: number | null;
  roundNumber: number | null;
  roundDurationSec: number | 60;
  startedAt: string | null;
  votes: Record<string, number>;
  remaining: number | null;
  cells: Cell[];
}

export default function VotePanel({
  roundId,
  roundNumber,
  roundDurationSec,
  startedAt,
  votes,
  remaining,
  cells,
}: Props) {
  // 득표 현황 — 좌표 표시, 상위 5개
  const voteEntries: VoteEntry[] = Array.from(
    Object.entries(votes)
      .reduce<Map<number, VoteEntry>>((map, [key, count]) => {
        const [cellIdStr, color] = key.split(":");
        const cellId = parseInt(cellIdStr);
        const cell = cells.find((c) => c.id === cellId);
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

  const maxCount = voteEntries[0]?.totalCount ?? 1; // count → totalCount
  const usedCount = remaining !== null ? VOTES_PER_ROUND - remaining : 0;

  // 5개 고정 슬롯
  const slots = Array.from({ length: MAX_ENTRIES }).map(
    (_, i) => voteEntries[i] ?? null,
  );

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      <h2 className="text-lg font-bold">VoteDots</h2>

      {/* 라운드 정보 + 타이머 */}
      <RoundInfo
        roundNumber={roundNumber}
        startedAt={startedAt}
        durationSec={roundDurationSec}
      />

      {/* 남은 투표권 */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">남은 투표권</p>
        <div className="flex gap-1">
          {remaining !== null ? (
            Array.from({ length: VOTES_PER_ROUND }).map((_, i) => (
              <span
                key={i}
                className={`text-lg ${i < usedCount ? "text-gray-300" : "text-blue-500"}`}
              >
                ●
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      </div>

      {/* 득표 현황 — 5개 고정 공간 + 빨간 테두리 */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">득표 현황</p>
        <div className="border border-red-400 rounded p-2 flex flex-col gap-1.5">
          {slots.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 h-5">
              {entry ? (
                <>
                  <div
                    className="w-3 h-3 rounded-sm shrink-0 border border-gray-200"
                    style={{ backgroundColor: entry.topColor }}
                  />
                  <span className="text-xs text-gray-500 w-16 shrink-0">
                    ({entry.x}, {entry.y})
                  </span>
                  <div className="flex-1 bg-gray-100 rounded h-2">
                    <div
                      className="h-2 rounded"
                      style={{
                        width: `${(entry.topCount / maxCount) * 100}%`,
                        backgroundColor: entry.topColor,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 shrink-0 text-right">
                    {entry.topCount}/{entry.totalCount}
                  </span>
                </>
              ) : (
                <div className="w-full h-2 bg-gray-50 rounded" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
