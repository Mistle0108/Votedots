import { useCallback, useState } from "react";
import { formatClockTime } from "@/features/gameplay/round/model/round.formatters";
import type {
  RoundInfo,
  RoundTimer,
} from "@/features/gameplay/round/model/round.types";

type RoundMetaFromTimer = Pick<
  RoundTimer,
  "roundDurationSec" | "totalRounds" | "gameEndAt"
>;

interface RoundStateValue {
  roundId: number | null;
  roundNumber: number | null;
  roundDurationSec: number | null;
  totalRounds: number;
  formattedGameEndTime: string | null;
}

export default function useRoundState() {
  const [roundId, setRoundId] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [roundDurationSec, setRoundDurationSec] = useState<number | null>(null);
  const [totalRounds, setTotalRounds] = useState(0);
  const [formattedGameEndTime, setFormattedGameEndTime] = useState<
    string | null
  >(null);

  const setRoundState = useCallback((state: RoundStateValue) => {
    setRoundId(state.roundId);
    setRoundNumber(state.roundNumber);
    setRoundDurationSec(state.roundDurationSec);
    setTotalRounds(state.totalRounds);
    setFormattedGameEndTime(state.formattedGameEndTime);
  }, []);

  const applyRoundState = useCallback((round: RoundInfo) => {
    setRoundState({
      roundId: round.id,
      roundNumber: round.roundNumber,
      roundDurationSec: round.roundDurationSec,
      totalRounds: round.totalRounds,
      formattedGameEndTime: formatClockTime(new Date(round.gameEndAt)),
    });
  }, [setRoundState]);

  const applyRoundMeta = useCallback((timer: RoundMetaFromTimer) => {
    setRoundDurationSec(timer.roundDurationSec);
    setTotalRounds(timer.totalRounds);
    setFormattedGameEndTime(formatClockTime(new Date(timer.gameEndAt)));
  }, []);

  const resetRoundState = useCallback(() => {
    setRoundState({
      roundId: null,
      roundNumber: null,
      roundDurationSec: null,
      totalRounds: 0,
      formattedGameEndTime: null,
    });
  }, [setRoundState]);

  return {
    roundId,
    roundNumber,
    roundDurationSec,
    totalRounds,
    formattedGameEndTime,
    setRoundState,
    applyRoundState,
    applyRoundMeta,
    resetRoundState,
  };
}
