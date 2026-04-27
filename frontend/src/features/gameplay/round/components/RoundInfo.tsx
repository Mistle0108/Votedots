import {
  getRoundProgressPercent,
  type RoundInfoProps,
} from "@/features/gameplay/round";
import {
  GAME_PHASE,
  type GamePhase,
} from "@/features/gameplay/session/model/game-phase.types";
import { useI18n } from "@/shared/i18n";

function getPhaseLabel(
  phase: GamePhase,
  translate: (key: string) => string,
): string {
  switch (phase) {
    case GAME_PHASE.INTRO:
      return translate("round.phase.intro");
    case GAME_PHASE.ROUND_START_WAIT:
      return translate("round.phase.startWait");
    case GAME_PHASE.ROUND_ACTIVE:
      return translate("round.phase.active");
    case GAME_PHASE.ROUND_RESULT:
      return translate("round.phase.result");
    case GAME_PHASE.GAME_END:
      return translate("round.phase.gameEnd");
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
  const { t } = useI18n();
  const phaseLabel = getPhaseLabel(phase, t);
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
          <span className="font-medium">{t("round.status")}</span>
          <span
            className="max-w-[132px] truncate text-right text-[color:var(--page-theme-primary-action)]"
            title={phaseLabel}
          >
            {phaseLabel}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">{t("round.round")}</span>
          <span className="text-[color:var(--page-theme-text-secondary)]">
            {roundNumber ? `${roundNumber}/${totalRounds}` : "-"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">{t("round.voters")}</span>
          <span className="text-[color:var(--page-theme-text-secondary)]">
            {votingParticipantCount !== null
              ? t("round.peopleCount", { count: votingParticipantCount })
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
            {t("round.gameEnd")}
          </span>
          <span className="text-[color:var(--page-theme-text-secondary)]">
            {formattedGameEndTime ?? "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
