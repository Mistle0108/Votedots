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

export default function useRoundState() {
  const [roundId, setRoundId] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [roundDurationSec, setRoundDurationSec] = useState<number | null>(null);
  const [totalRounds, setTotalRounds] = useState(0);
  const [formattedGameEndTime, setFormattedGameEndTime] = useState<
    string | null
  >(null);

  const applyRoundState = useCallback((round: RoundInfo) => {
    setRoundId(round.id);
    setRoundNumber(round.roundNumber);
    setRoundDurationSec(round.roundDurationSec);
    setTotalRounds(round.totalRounds);
    setFormattedGameEndTime(formatClockTime(new Date(round.gameEndAt)));
  }, []);

  const applyRoundMeta = useCallback((timer: RoundMetaFromTimer) => {
    setRoundDurationSec(timer.roundDurationSec);
    setTotalRounds(timer.totalRounds);
    setFormattedGameEndTime(formatClockTime(new Date(timer.gameEndAt)));
  }, []);

  const resetRoundState = useCallback(() => {
    setRoundId(null);
    setRoundNumber(null);
    setRoundDurationSec(null);
    setTotalRounds(0);
    setFormattedGameEndTime(null);
  }, []);

  return {
    roundId,
    roundNumber,
    roundDurationSec,
    totalRounds,
    formattedGameEndTime,
    applyRoundState,
    applyRoundMeta,
    resetRoundState,
  };
}
