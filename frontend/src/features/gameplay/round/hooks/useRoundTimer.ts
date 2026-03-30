import { useCallback, useState } from "react";
import { formatDuration } from "@/features/gameplay/round/model/round.formatters";
import type { RoundTimer } from "@/features/gameplay/round/model/round.types";

type RoundTimerState = Pick<
  RoundTimer,
  "remainingSeconds" | "isRoundExpired"
>;

export default function useRoundTimer() {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [formattedRemainingTime, setFormattedRemainingTime] = useState<
    string | null
  >(null);
  const [isRoundExpired, setIsRoundExpired] = useState(false);

  const applyRoundTimer = useCallback(
    ({ remainingSeconds, isRoundExpired }: RoundTimerState) => {
      setRemainingSeconds(remainingSeconds);
      setFormattedRemainingTime(formatDuration(remainingSeconds));
      setIsRoundExpired(isRoundExpired);
    },
    [],
  );

  const startRoundTimer = useCallback((roundDurationSec: number) => {
    setRemainingSeconds(roundDurationSec);
    setFormattedRemainingTime(formatDuration(roundDurationSec));
    setIsRoundExpired(false);
  }, []);

  const expireRoundTimer = useCallback(() => {
    setRemainingSeconds(0);
    setFormattedRemainingTime(formatDuration(0));
    setIsRoundExpired(true);
  }, []);

  const resetRoundTimer = useCallback(() => {
    setRemainingSeconds(null);
    setFormattedRemainingTime(null);
    setIsRoundExpired(false);
  }, []);

  return {
    remainingSeconds,
    formattedRemainingTime,
    isRoundExpired,
    applyRoundTimer,
    startRoundTimer,
    expireRoundTimer,
    resetRoundTimer,
  };
}
