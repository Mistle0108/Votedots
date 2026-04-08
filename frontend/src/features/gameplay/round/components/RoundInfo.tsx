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
    case GAME_PHASE.ROUND_START_WAIT:
      return "라운드 시작 대기";
    case GAME_PHASE.ROUND_ACTIVE:
      return "라운드 진행 중";
    case GAME_PHASE.ROUND_RESULT:
      return "라운드 결과 집계 중";
    case GAME_PHASE.GAME_END:
      return "게임 종료";
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
    phase === GAME_PHASE.ROUND_ACTIVE ? "bg-red-500" : "bg-gray-400";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">상태</span>
          <span className="text-gray-500">{getPhaseLabel(phase)}</span>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">라운드</span>
          <span className="text-gray-500">
            {roundNumber ? `${roundNumber}/${totalRounds}` : "-"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">투표자</span>
          <span className="text-gray-500">
            {votingParticipantCount !== null
              ? `${votingParticipantCount}명`
              : "-"}
          </span>
        </div>

        <div className="flex justify-center">
          <span className="text-2xl font-bold leading-none text-red-500">
            {formattedRemainingTime ?? "-"}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full ${progressColor}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-gray-600">게임 종료</span>
          <span className="text-gray-500">{formattedGameEndTime ?? "-"}</span>
        </div>
      </div>
    </div>
  );
}
