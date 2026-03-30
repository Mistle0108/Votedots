import { Cell } from "@/features/gameplay/canvas";
import { getVoteBoardEntries } from "../model/vote.selectors";

const MAX_ENTRIES = 5;

interface VoteStatusBoardProps {
  votes: Record<string, number>;
  cells: Cell[];
}

export default function VoteStatusBoard({
  votes,
  cells,
}: VoteStatusBoardProps) {
  const voteEntries = getVoteBoardEntries(votes, cells).slice(0, MAX_ENTRIES);
  const maxCount = voteEntries[0]?.totalCount ?? 1;
  const slots = Array.from({ length: MAX_ENTRIES }).map(
    (_, index) => voteEntries[index] ?? null,
  );

  return (
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
  );
}
