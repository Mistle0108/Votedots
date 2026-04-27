import {
  getRoundProgressPercent,
  type RoundInfoProps,
} from "@/features/gameplay/round";
import {
  GAME_PHASE,
  type GamePhase,
} from "@/features/gameplay/session/model/game-phase.types";

function getPhaseLabel(phase: GamePhase): string {
  switch (phase) {
    case GAME_PHASE.INTRO:
      return "게임 시작 안내";
    case GAME_PHASE.ROUND_START_WAIT:
      return "라운드 시작 대기";
    case GAME_PHASE.ROUND_ACTIVE:
      return "라운드 진행 중";
    case GAME_PHASE.ROUND_RESULT:
      return "라운드 결과 집계 중";
    case GAME_PHASE.GAME_END:
      return "게임 종료";
    default:
      return "-";
  }
}

export default function RoundInfo({
  phase,
  roundNumber,
  totalRounds,
  formattedGameEndTime,
  formattedRemainingTime,
  remainingSeconds,
  roundDurationSec,
  votingParticipantCount,
}: RoundInfoProps) {
  const showProgress =
    remainingSeconds !== null &&
    roundDurationSec !== null &&
    roundDurationSec > 0;

  const progressPercent = showProgress
    ? getRoundProgressPercent(remainingSeconds, roundDurationSec)
    : 100;

  const progressColor =
    phase === GAME_PHASE.ROUND_ACTIVE
      ? "var(--page-theme-alert)"
      : "var(--page-theme-primary-action)";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">상태</span>
          <span className="text-[color:var(--page-theme-primary-action)]">
            {getPhaseLabel(phase)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">라운드</span>
          <span className="text-[color:var(--page-theme-text-secondary)]">
            {roundNumber ? `${roundNumber}/${totalRounds}` : "-"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">투표자</span>
          <span className="text-[color:var(--page-theme-text-secondary)]">
            {votingParticipantCount !== null
              ? `${votingParticipantCount}명`
              : "-"}
          </span>
        </div>

        <div className="flex justify-center">
          <span className="text-2xl font-bold leading-none text-[color:var(--page-theme-alert)]">
            {formattedRemainingTime ?? "-"}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--page-theme-alert-soft)]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-[color:var(--page-theme-text-secondary)]">
            게임 종료
          </span>
          <span className="text-[color:var(--page-theme-text-secondary)]">
            {formattedGameEndTime ?? "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
