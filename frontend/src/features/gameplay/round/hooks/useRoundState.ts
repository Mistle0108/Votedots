import { useCallback, useState } from "react";
import { formatClockTime } from "@/features/gameplay/round/model/round.formatters";
import type {
  RoundInfo,
  RoundTimer,
} from "@/features/gameplay/round/model/round.types";
import type { GamePhase } from "@/features/gameplay/session/model/game-phase.types";

type RoundMetaFromTimer = Pick<
  RoundTimer,
  "roundDurationSec" | "totalRounds" | "gameEndAt"
>;

interface RoundStateValue {
  phase: GamePhase;
  roundId: number | null;
  roundNumber: number | null;
  roundDurationSec: number | null;
  totalRounds: number;
  formattedGameEndTime: string | null;
  phaseStartedAt: string | null;
  phaseEndsAt: string | null;
}

export default function useRoundState() {
  const [phase, setPhase] = useState<GamePhase>("round_start_wait");
  const [roundId, setRoundId] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [roundDurationSec, setRoundDurationSec] = useState<number | null>(null);
  const [totalRounds, setTotalRounds] = useState(0);
  const [formattedGameEndTime, setFormattedGameEndTime] = useState<
    string | null
  >(null);
  const [phaseStartedAt, setPhaseStartedAt] = useState<string | null>(null);
  const [phaseEndsAt, setPhaseEndsAt] = useState<string | null>(null);

  const setRoundState = useCallback((state: RoundStateValue) => {
    setPhase(state.phase);
    setRoundId(state.roundId);
    setRoundNumber(state.roundNumber);
    setRoundDurationSec(state.roundDurationSec);
    setTotalRounds(state.totalRounds);
    setFormattedGameEndTime(state.formattedGameEndTime);
    setPhaseStartedAt(state.phaseStartedAt);
    setPhaseEndsAt(state.phaseEndsAt);
  }, []);

  const applyRoundState = useCallback(
    (round: RoundInfo, nextPhase: GamePhase) => {
      setRoundState({
        phase: nextPhase,
        roundId: round.id,
        roundNumber: round.roundNumber,
        roundDurationSec: round.roundDurationSec,
        totalRounds: round.totalRounds,
        formattedGameEndTime: formatClockTime(new Date(round.gameEndAt)),
        phaseStartedAt: round.startedAt,
        phaseEndsAt: null,
      });
    },
    [setRoundState],
  );

  const applyRoundMeta = useCallback((timer: RoundMetaFromTimer) => {
    setRoundDurationSec(timer.roundDurationSec);
    setTotalRounds(timer.totalRounds);
    setFormattedGameEndTime(formatClockTime(new Date(timer.gameEndAt)));
  }, []);

  const resetRoundState = useCallback(() => {
    setRoundState({
      phase: "round_start_wait",
      roundId: null,
      roundNumber: null,
      roundDurationSec: null,
      totalRounds: 0,
      formattedGameEndTime: null,
      phaseStartedAt: null,
      phaseEndsAt: null,
    });
  }, [setRoundState]);

  return {
    phase,
    roundId,
    roundNumber,
    roundDurationSec,
    totalRounds,
    formattedGameEndTime,
    phaseStartedAt,
    phaseEndsAt,
    setRoundState,
    applyRoundState,
    applyRoundMeta,
    resetRoundState,
  };
}
