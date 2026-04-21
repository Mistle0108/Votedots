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
function GameIntroCard({ onOpenIntroGuide }: { onOpenIntroGuide: () => void }) {
  return (
    <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm">
      <div className="w-full text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
          Game Intro
        </p>
        <h2 className="mt-1 text-base font-bold text-gray-950">게임 인트로</h2>
      </div>
      <button
        type="button"
        onClick={onOpenIntroGuide}
        className="mt-3 w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        인트로 다시 보기
      </button>
    </section>
  );
}

function HistoryTimelineCard({
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
        className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-center transition hover:border-amber-300 hover:bg-amber-100"
      >
        <div className="flex items-center justify-center gap-2">
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
            최종 결과
          </span>
        </div>

        <p className="mt-2 text-sm font-semibold text-gray-950">
          게임 결과 통계
        </p>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenRoundSummary(item.data)}
      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-center transition hover:border-blue-300 hover:bg-blue-50"
    >
      <p className="mt-2 text-center text-sm font-semibold text-gray-950">
        {item.roundNumber}라운드 결과
      </p>
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
    <aside className="flex h-full min-h-0 w-[260px] max-w-[260px] shrink-0 flex-col gap-3 overflow-hidden border-r border-gray-200 bg-white p-3">
      <GameIntroCard onOpenIntroGuide={onOpenIntroGuide} />

      <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="w-full text-center">
            <h3 className="text-sm font-semibold text-gray-950">
              결과 타임라인
            </h3>
          </div>

          {historyItems.length > 0 && (
            <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white">
              {historyItems.length}
            </span>
          )}
        </div>

        {historyLoading && (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-500">
            히스토리를 불러오는 중입니다.
          </p>
        )}

        {!historyLoading && historyError && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {historyError}
          </p>
        )}

        {!historyLoading && !historyError && historyItems.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-500">
            아직 표시할 라운드 결과가 없습니다.
          </p>
        )}

        {!historyLoading && !historyError && historyItems.length > 0 && (
          <div className="space-y-2">
            {historyItems.map((item) => (
              <HistoryTimelineCard
                key={item.id}
                item={item}
                onOpenRoundSummary={onOpenRoundSummary}
                onOpenGameSummary={onOpenGameSummary}
              />
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
