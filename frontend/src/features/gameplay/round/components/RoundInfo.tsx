import { useEffect, useState } from "react";
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
  participantCount,
  participantCountLoading,
}: RoundInfoProps) {
  const [enableProgressTransition, setEnableProgressTransition] =
    useState(false);
  const progressPercent = getRoundProgressPercent(
    remainingSeconds,
    roundDurationSec,
  );

  const participantCountText = participantCountLoading
    ? "불러오는 중..."
    : participantCount !== null
      ? `${participantCount}명`
      : "-";

  useEffect(() => {
    const isInitialSync =
      remainingSeconds !== null &&
      roundDurationSec !== null &&
      (remainingSeconds === roundDurationSec || !enableProgressTransition);

    if (!isInitialSync) return;

    setEnableProgressTransition(false);

    const frame1 = requestAnimationFrame(() => {
      const frame2 = requestAnimationFrame(() => {
        setEnableProgressTransition(true);
      });

      return () => cancelAnimationFrame(frame2);
    });

    return () => cancelAnimationFrame(frame1);
  }, [remainingSeconds, roundDurationSec, enableProgressTransition]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">라운드</p>
        <p className="text-sm text-gray-500">
          {roundNumber ? `${roundNumber}/${totalRounds}` : "-"}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">참여자</p>
        <p className="text-sm text-gray-500">{participantCountText}</p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">게임 종료</p>
        <p className="text-sm text-gray-500">{formattedGameEndTime ?? "-"}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium">타이머</p>
        <p className="text-base font-bold text-red-500">
          {formattedRemainingTime ?? "-"}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full bg-red-500 ${
              enableProgressTransition
                ? "transition-[width] duration-1000 linear"
                : ""
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
