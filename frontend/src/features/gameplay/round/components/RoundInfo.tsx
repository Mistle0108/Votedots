import {
  getRoundProgressPercent,
  type RoundInfoProps,
} from "@/features/gameplay/round";

export default function RoundInfo({
  roundNumber,
  totalRounds,
  formattedGameEndTime,
  formattedRemainingTime,
  remainingSeconds,
  roundDurationSec,
  votingParticipantCount,
}: RoundInfoProps) {
  const progressPercent = getRoundProgressPercent(
    remainingSeconds,
    roundDurationSec,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
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
            className="h-full rounded-full bg-red-500"
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
