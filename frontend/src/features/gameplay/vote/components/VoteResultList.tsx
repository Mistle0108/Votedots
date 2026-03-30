import { VoteEntry } from "../model/vote.types";

interface VoteResultListProps {
  voteEntries: VoteEntry[];
  maxCount: number;
  onSelectColor: (color: string) => void;
}

export default function VoteResultList({
  voteEntries,
  maxCount,
  onSelectColor,
}: VoteResultListProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium">득표 현황</p>
      <div className="flex max-h-[72px] flex-col gap-1 overflow-y-auto">
        {voteEntries.map(({ color, count }) => (
          <button
            key={color}
            className="flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation();
              onSelectColor(color);
            }}
          >
            <div
              className="h-3 w-3 shrink-0 rounded-sm border border-gray-200"
              style={{ backgroundColor: color }}
            />
            <span className="w-14 shrink-0 text-left text-xs text-gray-500">
              {color}
            </span>
            <div className="h-2 flex-1 rounded bg-gray-100">
              <div
                className="h-2 rounded transition-all"
                style={{
                  width: `${(count / maxCount) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="w-4 shrink-0 text-right text-xs text-gray-500">
              {count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
