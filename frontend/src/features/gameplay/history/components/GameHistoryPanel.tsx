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
        className="h-9 w-full shrink-0 rounded-lg border border-[color:var(--page-theme-accent-warm)] bg-[color:var(--page-theme-accent-warm-soft)] text-xs font-bold text-[color:var(--page-theme-accent-warm)] transition hover:opacity-90"
      >
        RESULT
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenRoundSummary(item.data)}
      className="h-9 w-full shrink-0 rounded-lg border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] text-xs font-bold text-[color:var(--page-theme-text-primary)] transition hover:border-[color:var(--page-theme-primary-action)] hover:bg-[color:var(--page-theme-surface-secondary)] hover:text-[color:var(--page-theme-primary-action)]"
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
    <aside className="flex h-full min-h-0 w-[88px] max-w-[88px] shrink-0 flex-col gap-2 overflow-hidden border-r border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-panel-background)] p-2">
      <button
        type="button"
        onClick={onOpenIntroGuide}
        className="h-9 w-full shrink-0 rounded-lg border border-[color:var(--page-theme-primary-action)] bg-[color:var(--page-theme-primary-action)] text-xs font-bold text-[color:var(--page-theme-primary-action-text)] transition hover:bg-[color:var(--page-theme-primary-action-hover)]"
      >
        INTRO
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {historyLoading && (
          <div className="rounded-lg border border-dashed border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-1 py-2 text-center text-[10px] font-medium text-[color:var(--page-theme-text-tertiary)]">
            LOAD
          </div>
        )}

        {!historyLoading && historyError && (
          <div className="rounded-lg border border-[color:var(--page-theme-alert)] bg-[color:var(--page-theme-alert-soft)] px-1 py-2 text-center text-[10px] font-medium text-[color:var(--page-theme-alert)]">
            ERR
          </div>
        )}

        {!historyLoading && !historyError && historyItems.length === 0 && (
          <div className="rounded-lg border border-[color:var(--page-theme-accent-warm)] bg-[color:var(--page-theme-accent-warm-soft)] px-1 py-2 text-center text-[10px] font-medium text-[color:var(--page-theme-accent-warm)]">
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
