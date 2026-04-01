import { useCallback, useEffect } from "react";
import {
  useRoundState,
  useRoundTimer,
} from "@/features/gameplay/round";
import {
  SessionBootstrapResult,
  useGameSession,
  useGameplaySocket,
} from "@/features/gameplay/session";
import { useVoteTickets } from "@/features/gameplay/vote";

function formatClockTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

interface UseCanvasGameplayParams {
  canvasId: number | null;
  onBootstrapScene: (result: SessionBootstrapResult) => void;
  onCanvasUpdated: (payload: { cellId: number; color: string }) => void;
  onGameEndedCleanup: () => void;
  applyVoteUpdate: (votes: Record<string, number>) => void;
  resetVoteState: () => void;
}

export default function useCanvasGameplay({
  canvasId,
  onBootstrapScene,
  onCanvasUpdated,
  onGameEndedCleanup,
  applyVoteUpdate,
  resetVoteState,
}: UseCanvasGameplayParams) {
  const {
    roundId,
    roundNumber,
    roundDurationSec,
    totalRounds,
    formattedGameEndTime,
    setRoundState,
    applyRoundMeta,
    resetRoundState,
  } = useRoundState();

  const {
    remainingSeconds,
    formattedRemainingTime,
    isRoundExpired,
    setRoundTimerState,
    applyRoundTimer,
    startRoundTimer,
    expireRoundTimer,
    resetRoundTimer,
  } = useRoundTimer();

  const { remaining, setRemaining, fetchTickets, clearTickets } =
    useVoteTickets();

  const applyBootstrap = useCallback(
    (result: SessionBootstrapResult) => {
      onBootstrapScene(result);

      setRoundState({
        roundId: result.round.roundId,
        roundNumber: result.round.roundNumber,
        roundDurationSec: result.round.roundDurationSec,
        totalRounds: result.round.totalRounds,
        formattedGameEndTime: result.round.formattedGameEndTime,
      });

      setRoundTimerState({
        remainingSeconds: result.round.remainingSeconds,
        formattedRemainingTime: result.round.formattedRemainingTime,
        isRoundExpired: result.round.isRoundExpired,
      });

      setRemaining(result.remaining);
    },
    [onBootstrapScene, setRemaining, setRoundState, setRoundTimerState],
  );

  const {
    loading,
    error,
    gameEnded,
    initializeSession,
    clearSessionError,
    markGameEnded,
  } = useGameSession({
    onBootstrap: applyBootstrap,
  });

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  const handleRoundStarted = useCallback(
    async ({
      roundId,
      roundNumber,
      totalRounds,
      gameEndAt,
      roundDurationSec,
    }: {
      roundId: number;
      roundNumber: number;
      startedAt: string;
      roundDurationSec: number;
      totalRounds: number;
      gameEndAt: string;
    }) => {
      setRoundState({
        roundId,
        roundNumber,
        roundDurationSec,
        totalRounds,
        formattedGameEndTime: formatClockTime(new Date(gameEndAt)),
      });

      startRoundTimer(roundDurationSec);
      clearSessionError();
      resetVoteState();
      await fetchTickets(roundId);
    },
    [
      clearSessionError,
      fetchTickets,
      resetVoteState,
      setRoundState,
      startRoundTimer,
    ],
  );

  const handleRoundEnded = useCallback(() => {
    clearTickets();
    expireRoundTimer();
    resetVoteState();
  }, [clearTickets, expireRoundTimer, resetVoteState]);

  const handleVoteUpdate = useCallback(
    ({ votes }: { votes: Record<string, number> }) => {
      applyVoteUpdate(votes);
    },
    [applyVoteUpdate],
  );

  const handleTimerUpdate = useCallback(
    ({
      remainingSeconds,
      isRoundExpired,
      gameEndAt,
      roundDurationSec,
      totalRounds,
    }: {
      remainingSeconds: number;
      isRoundExpired: boolean;
      gameEndAt: string;
      roundDurationSec: number;
      totalRounds: number;
    }) => {
      applyRoundTimer({ remainingSeconds, isRoundExpired });
      applyRoundMeta({ roundDurationSec, totalRounds, gameEndAt });
    },
    [applyRoundMeta, applyRoundTimer],
  );

  const handleGameEnded = useCallback(() => {
    markGameEnded();
    clearTickets();
    onGameEndedCleanup();
    resetRoundState();
    resetRoundTimer();
    resetVoteState();
  }, [
    clearTickets,
    markGameEnded,
    onGameEndedCleanup,
    resetRoundState,
    resetRoundTimer,
    resetVoteState,
  ]);

  useGameplaySocket({
    canvasId,
    onRoundStarted: handleRoundStarted,
    onRoundEnded: handleRoundEnded,
    onCanvasUpdated,
    onVoteUpdate: handleVoteUpdate,
    onTimerUpdate: handleTimerUpdate,
    onGameEnded: handleGameEnded,
  });

  const handleVoteSuccess = useCallback(() => {
    if (roundId) {
      void fetchTickets(roundId);
    }
  }, [fetchTickets, roundId]);

  return {
    loading,
    error,
    gameEnded,
    handleVoteSuccess,
    roundId,
    roundNumber,
    totalRounds,
    formattedGameEndTime,
    formattedRemainingTime,
    remainingSeconds,
    roundDurationSec,
    isRoundExpired,
    remaining,
    isRoundExpiredRefValue: isRoundExpired,
  };
}
