import type {
  GameSummaryData,
  RoundSummaryData,
} from "@/features/gameplay/session/api/session.api";
import type { GameHistoryItem } from "../model/history.types";

interface Props {
  historyItems: GameHistoryItem[];
  historyLoading: boolean;
  historyError: string | null;
  onOpenIntroGuide: () => void;
  onOpenRoundSummary: (summary: RoundSummaryData) => void;
  onOpenGameSummary: (summary: GameSummaryData) => void;
}

function HistoryTimelineButton({
  item,
  onOpenRoundSummary,
  onOpenGameSummary,
}: {
  item: GameHistoryItem;
  onOpenRoundSummary: (summary: RoundSummaryData) => void;
  onOpenGameSummary: (summary: GameSummaryData) => void;
}) {
  if (item.type === "game") {
    return (
      <button
        type="button"
        onClick={() => onOpenGameSummary(item.data)}
        className="h-9 w-full shrink-0 rounded-lg border border-amber-200 bg-amber-50 text-xs font-bold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
      >
        RESULT
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenRoundSummary(item.data)}
      className="h-9 w-full shrink-0 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
    >
      {item.roundNumber}R
    </button>
  );
}

export default function GameHistoryPanel({
  historyItems,
  historyLoading,
  historyError,
  onOpenIntroGuide,
  onOpenRoundSummary,
  onOpenGameSummary,
}: Props) {
  return (
    <aside className="flex h-full min-h-0 w-[88px] max-w-[88px] shrink-0 flex-col gap-2 overflow-hidden border-r border-gray-200 bg-white p-2">
      <button
        type="button"
        onClick={onOpenIntroGuide}
        className="h-9 w-full shrink-0 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
      >
        INTRO
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {historyLoading && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-1 py-2 text-center text-[10px] font-medium text-gray-400">
            LOAD
          </div>
        )}

        {!historyLoading && historyError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-1 py-2 text-center text-[10px] font-medium text-red-500">
            ERR
          </div>
        )}

        {!historyLoading && !historyError && historyItems.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-1 py-2 text-center text-[10px] font-medium text-gray-400">
            EMPTY
          </div>
        )}

        {!historyLoading && !historyError && historyItems.length > 0 && (
          <div className="flex min-h-0 flex-col gap-1.5 pb-1">
            {historyItems.map((item) => (
              <HistoryTimelineButton
                key={item.id}
                item={item}
                onOpenRoundSummary={onOpenRoundSummary}
                onOpenGameSummary={onOpenGameSummary}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
