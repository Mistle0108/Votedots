import { useCallback, useState } from "react";
import { formatDuration } from "@/features/gameplay/round/model/round.formatters";
import type { RoundTimer } from "@/features/gameplay/round/model/round.types";

type RoundTimerState = Pick<
  RoundTimer,
  "remainingSeconds" | "isRoundExpired"
>;

interface RoundTimerStateValue {
  remainingSeconds: number | null;
  formattedRemainingTime: string | null;
  isRoundExpired: boolean;
}

export default function useRoundTimer() {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [formattedRemainingTime, setFormattedRemainingTime] = useState<
    string | null
  >(null);
  const [isRoundExpired, setIsRoundExpired] = useState(false);

  const setRoundTimerState = useCallback((state: RoundTimerStateValue) => {
    setRemainingSeconds(state.remainingSeconds);
    setFormattedRemainingTime(state.formattedRemainingTime);
    setIsRoundExpired(state.isRoundExpired);
  }, []);

  const applyRoundTimer = useCallback(
    ({ remainingSeconds, isRoundExpired }: RoundTimerState) => {
      setRoundTimerState({
        remainingSeconds,
        formattedRemainingTime: formatDuration(remainingSeconds),
        isRoundExpired,
      });
    },
    [setRoundTimerState],
  );

  const startRoundTimer = useCallback((roundDurationSec: number) => {
    setRoundTimerState({
      remainingSeconds: roundDurationSec,
      formattedRemainingTime: formatDuration(roundDurationSec),
      isRoundExpired: false,
    });
  }, [setRoundTimerState]);

  const expireRoundTimer = useCallback(() => {
    setRoundTimerState({
      remainingSeconds: 0,
      formattedRemainingTime: formatDuration(0),
      isRoundExpired: true,
    });
  }, [setRoundTimerState]);

  const resetRoundTimer = useCallback(() => {
    setRoundTimerState({
      remainingSeconds: null,
      formattedRemainingTime: null,
      isRoundExpired: false,
    });
  }, [setRoundTimerState]);

  return {
    remainingSeconds,
    formattedRemainingTime,
    isRoundExpired,
    setRoundTimerState,
    applyRoundTimer,
    startRoundTimer,
    expireRoundTimer,
    resetRoundTimer,
  };
}
