import { useEffect, useState } from "react";
import { getRoundProgressPercent } from "../model/round.formatters";
import type { RoundInfoProps } from "../model/round.types";
import RoundProgress from "./RoundProgress";

export default function RoundInfo({
  roundNumber,
  totalRounds,
  formattedGameEndTime,
  formattedRemainingTime,
  remainingSeconds,
  roundDurationSec,
}: RoundInfoProps) {
  const [enableProgressTransition, setEnableProgressTransition] =
    useState(false);

  const progressPercent = getRoundProgressPercent(
    remainingSeconds,
    roundDurationSec,
  );

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
        <p className="text-sm font-medium">게임 종료</p>
        <p className="text-sm text-gray-500">{formattedGameEndTime ?? "-"}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium">잔여 타임</p>
        <p className="text-base font-bold text-red-500">
          {formattedRemainingTime ?? "-"}
        </p>

        <RoundProgress
          progressPercent={progressPercent}
          enableTransition={enableProgressTransition}
        />
      </div>
    </div>
  );
}
