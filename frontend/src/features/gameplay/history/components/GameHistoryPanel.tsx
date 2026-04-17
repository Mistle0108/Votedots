import IntroPanelButton from "@/features/gameplay/intro/components/IntroPanelButton";
import { RoundPanelList } from "@/features/gameplay/round";
import type { RoundSummaryData } from "@/features/gameplay/session/api/session.api";

interface GameHistoryPanelProps {
  onOpenIntroGuide: () => void;
  onOpenLatestRoundSummary: () => void;
  latestRoundSummary: RoundSummaryData | null;
  isLatestRoundSummaryEnabled: boolean;
}

export default function GameHistoryPanel({
  onOpenIntroGuide,
  onOpenLatestRoundSummary,
  latestRoundSummary,
  isLatestRoundSummaryEnabled,
}: GameHistoryPanelProps) {
  return (
    <aside className="flex w-[256px] shrink-0 flex-col gap-3 border-r border-gray-200 bg-white px-4 py-5">
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
          History
        </p>
        <p className="mt-1 text-lg font-bold text-gray-900">Game History</p>
        <p className="mt-1 text-sm text-gray-500">
          인트로와 최근 라운드 결과를 다시 확인할 수 있어요.
        </p>
      </div>

      <IntroPanelButton onClick={onOpenIntroGuide} />

      <RoundPanelList>
        <button
          type="button"
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:opacity-60"
          onClick={onOpenLatestRoundSummary}
          disabled={!isLatestRoundSummaryEnabled || !latestRoundSummary}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
            Round
          </p>
          <p className="mt-1 text-base font-bold text-gray-900">
            {latestRoundSummary
              ? `${latestRoundSummary.roundNumber} 라운드 결과`
              : "최근 라운드 결과"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {isLatestRoundSummaryEnabled && latestRoundSummary
              ? "클릭하면 최근 라운드 결과 모달을 다시 확인할 수 있어요."
              : "ROUND_RESULT 또는 ROUND_START_WAIT 상태에서만 열 수 있어요."}
          </p>
        </button>
      </RoundPanelList>
    </aside>
  );
}
