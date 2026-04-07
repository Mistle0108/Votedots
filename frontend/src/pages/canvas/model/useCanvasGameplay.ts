import { useCallback, useEffect } from "react";
import { useRoundState, useRoundTimer } from "@/features/gameplay/round";
import {
  useGameSession,
  useGameplaySocket,
  useParticipantsState,
  type SessionBootstrapResult,
} from "@/features/gameplay/session";
import {
  GAME_PHASE,
  isRoundActivePhase,
} from "@/features/gameplay/session/model/game-phase.types";
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
  onSessionEnded: () => void;
  onUnauthorized: (message: string) => void;
  applyVoteUpdate: (votes: Record<string, number>) => void;
  resetVoteState: () => void;
}

export default function useCanvasGameplay({
  canvasId,
  onBootstrapScene,
  onCanvasUpdated,
  onGameEndedCleanup,
  onSessionEnded,
  applyVoteUpdate,
  resetVoteState,
}: UseCanvasGameplayParams) {
  const {
    phase,
    roundId,
    roundNumber,
    roundDurationSec,
    totalRounds,
    formattedGameEndTime,
    phaseEndsAt,
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
    setPhaseTimerState,
    startRoundTimer,
    expireRoundTimer,
    resetRoundTimer,
  } = useRoundTimer();

  const { remaining, setRemaining, fetchTickets, clearTickets } =
    useVoteTickets();

  const {
    participantCount,
    participants,
    participantLoading,
    participantError,
    participantSummary,
    refreshParticipants,
    applyParticipantCount,
    clearParticipants,
  } = useParticipantsState();

  const applyBootstrap = useCallback(
    (result: SessionBootstrapResult) => {
      onBootstrapScene(result);

      setRoundState({
        phase: result.round.phase,
        roundId: result.round.roundId,
        roundNumber: result.round.roundNumber,
        roundDurationSec: result.round.roundDurationSec,
        totalRounds: result.round.totalRounds,
        formattedGameEndTime: result.round.formattedGameEndTime,
        phaseStartedAt: result.round.phaseStartedAt,
        phaseEndsAt: result.round.phaseEndsAt,
      });

      if (isRoundActivePhase(result.round.phase)) {
        setRoundTimerState({
          remainingSeconds: result.round.remainingSeconds,
          formattedRemainingTime: result.round.formattedRemainingTime,
          isRoundExpired: result.round.isRoundExpired,
        });
      } else {
        setPhaseTimerState(
          result.round.phaseEndsAt,
          result.round.isRoundExpired,
        );
      }

      setRemaining(result.remaining);
    },
    [
      onBootstrapScene,
      setPhaseTimerState,
      setRemaining,
      setRoundState,
      setRoundTimerState,
    ],
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
    let cancelled = false;

    void initializeSession().then((result) => {
      if (cancelled || !result) {
        return;
      }

      if (result.round.phase === GAME_PHASE.GAME_END) {
        markGameEnded();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initializeSession, markGameEnded]);

  useEffect(() => {
    if (!canvasId) {
      clearParticipants();
      return;
    }

    void refreshParticipants();
  }, [canvasId, clearParticipants, refreshParticipants]);

  useEffect(() => {
    if (isRoundActivePhase(phase)) {
      return;
    }

    setPhaseTimerState(
      phaseEndsAt,
      phase === GAME_PHASE.ROUND_RESULT || phase === GAME_PHASE.GAME_END,
    );

    if (!phaseEndsAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setPhaseTimerState(
        phaseEndsAt,
        phase === GAME_PHASE.ROUND_RESULT || phase === GAME_PHASE.GAME_END,
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [phase, phaseEndsAt, setPhaseTimerState]);

  const handleCanvasJoined = useCallback(() => {
    void refreshParticipants();
  }, [refreshParticipants]);

  const handleRoundStarted = useCallback(
    async ({
      roundId,
      roundNumber,
      totalRounds,
      gameEndAt,
      roundDurationSec,
      startedAt,
    }: {
      roundId: number;
      roundNumber: number;
      startedAt: string;
      roundDurationSec: number;
      totalRounds: number;
      gameEndAt: string;
    }) => {
      setRoundState({
        phase: GAME_PHASE.ROUND_ACTIVE,
        roundId,
        roundNumber,
        roundDurationSec,
        totalRounds,
        formattedGameEndTime: formatClockTime(new Date(gameEndAt)),
        phaseStartedAt: startedAt,
        phaseEndsAt: null,
      });

      startRoundTimer(roundDurationSec);
      clearSessionError();
      resetVoteState();

      await Promise.all([fetchTickets(roundId), refreshParticipants()]);
    },
    [
      clearSessionError,
      fetchTickets,
      refreshParticipants,
      resetVoteState,
      setRoundState,
      startRoundTimer,
    ],
  );

  const handleRoundEnded = useCallback(
    ({
      roundId,
      roundNumber,
      endedAt,
    }: {
      roundId: number;
      roundNumber: number;
      endedAt: string;
    }) => {
      clearTickets();
      expireRoundTimer();
      resetVoteState();

      setRoundState({
        phase: GAME_PHASE.ROUND_RESULT,
        roundId,
        roundNumber,
        roundDurationSec,
        totalRounds,
        formattedGameEndTime,
        phaseStartedAt: endedAt,
        phaseEndsAt: null,
      });
    },
    [
      clearTickets,
      expireRoundTimer,
      formattedGameEndTime,
      resetVoteState,
      roundDurationSec,
      setRoundState,
      totalRounds,
    ],
  );

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

  const handleParticipantsUpdated = useCallback(
    async ({ count }: { canvasId: number; count: number }) => {
      applyParticipantCount(count);
      await refreshParticipants();
    },
    [applyParticipantCount, refreshParticipants],
  );

  const handleSessionEnded = useCallback(() => {
    clearTickets();
    clearParticipants();
    resetRoundState();
    resetRoundTimer();
    resetVoteState();
    onSessionEnded();
  }, [
    clearParticipants,
    clearTickets,
    onSessionEnded,
    resetRoundState,
    resetRoundTimer,
    resetVoteState,
  ]);

  const handleGameEnded = useCallback(() => {
    markGameEnded();
    clearTickets();
    clearParticipants();
    onGameEndedCleanup();
    resetRoundState();
    resetRoundTimer();
    resetVoteState();
  }, [
    clearParticipants,
    clearTickets,
    markGameEnded,
    onGameEndedCleanup,
    resetRoundState,
    resetRoundTimer,
    resetVoteState,
  ]);

  useGameplaySocket({
    canvasId,
    onCanvasJoined: handleCanvasJoined,
    onRoundStarted: handleRoundStarted,
    onRoundEnded: handleRoundEnded,
    onCanvasUpdated,
    onVoteUpdate: handleVoteUpdate,
    onTimerUpdate: handleTimerUpdate,
    onParticipantsUpdated: handleParticipantsUpdated,
    onSessionEnded: handleSessionEnded,
    onGameEnded: handleGameEnded,
  });

  const handleVoteSuccess = useCallback(() => {
    if (roundId && isRoundActivePhase(phase)) {
      void fetchTickets(roundId);
    }
  }, [fetchTickets, phase, roundId]);

  return {
    loading,
    error,
    gameEnded,
    handleVoteSuccess,
    phase,
    roundId,
    roundNumber,
    totalRounds,
    formattedGameEndTime,
    formattedRemainingTime,
    remainingSeconds,
    roundDurationSec,
    isRoundExpired,
    remaining,
    participantCount,
    votingParticipantCount: participantLoading
      ? null
      : participantSummary.votingCount,
    participants,
    participantLoading,
    participantError,
    isRoundExpiredRefValue: isRoundExpired,
  };
}
