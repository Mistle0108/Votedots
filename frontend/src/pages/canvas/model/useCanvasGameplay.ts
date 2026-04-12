import { useCallback, useEffect, useRef } from "react";
import { useRoundState, useRoundTimer } from "@/features/gameplay/round";
import {
  useGameSession,
  useGameplaySocket,
  useParticipantsState,
  type SessionBootstrapResult,
  type PhaseTimingState,
} from "@/features/gameplay/session";
import type { CanvasBatchUpdatedPayload } from "@/features/gameplay/session/model/socket.types"; // 추가: batch payload 타입 사용
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
  onCanvasBatchUpdated: (payload: CanvasBatchUpdatedPayload) => void; // 변경: 실제 socket payload 타입과 맞춤
  onGameEndedCleanup: () => void;
  onSessionEnded: () => void;
  onUnauthorized: (message: string) => void;
  applyVoteUpdate: (votes: Record<string, number>) => void;
  resetVoteState: () => void;
}

const DEFAULT_PHASE_TIMING: PhaseTimingState = {
  introPhaseSec: 0,
  roundStartWaitSec: 0,
  roundResultDelaySec: 0,
  gameEndWaitSec: 0,
};

export default function useCanvasGameplay({
  canvasId,
  onBootstrapScene,
  onCanvasUpdated,
  onCanvasBatchUpdated, // 추가: batch canvas update handler 수신
  onGameEndedCleanup,
  onSessionEnded,
  onUnauthorized,
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
    resetRoundTimer,
  } = useRoundTimer();

  const phaseTimingRef = useRef<PhaseTimingState>(DEFAULT_PHASE_TIMING);
  const localPhaseTransitionTimerRef = useRef<number | null>(null);

  const clearLocalPhaseTransitionTimer = useCallback(() => {
    if (localPhaseTransitionTimerRef.current === null) {
      return;
    }

    window.clearTimeout(localPhaseTransitionTimerRef.current);
    localPhaseTransitionTimerRef.current = null;
  }, []);

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
      phaseTimingRef.current = result.phaseTiming;

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

      applyVoteUpdate(result.votes);
      setRemaining(result.remaining);
    },
    [
      applyVoteUpdate,
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
    onUnauthorized,
  });

  useEffect(() => {
    return () => {
      clearLocalPhaseTransitionTimer();
    };
  }, [clearLocalPhaseTransitionTimer]);

  useEffect(() => {
    let cancelled = false;

    void initializeSession().then((result) => {
      if (cancelled || !result) {
        return;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initializeSession]);

  useEffect(() => {
    if (!canvasId) {
      clearParticipants();
      return;
    }

    if (phase === GAME_PHASE.GAME_END) {
      clearParticipants();
      return;
    }

    void refreshParticipants();
  }, [canvasId, clearParticipants, phase, refreshParticipants]);

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

  useEffect(() => {
    clearLocalPhaseTransitionTimer();

    if (!phaseEndsAt || roundNumber === null) {
      return;
    }

    if (phase === GAME_PHASE.INTRO) {
      const delayMs = Math.max(0, new Date(phaseEndsAt).getTime() - Date.now());

      localPhaseTransitionTimerRef.current = window.setTimeout(() => {
        localPhaseTransitionTimerRef.current = null;

        const waitStartedAt = phaseEndsAt;
        const waitEndsAt = new Date(
          new Date(waitStartedAt).getTime() +
            phaseTimingRef.current.roundStartWaitSec * 1000,
        ).toISOString();

        setRoundState({
          phase: GAME_PHASE.ROUND_START_WAIT,
          roundId: null,
          roundNumber: 1,
          roundDurationSec: phaseTimingRef.current.roundStartWaitSec,
          totalRounds,
          formattedGameEndTime,
          phaseStartedAt: waitStartedAt,
          phaseEndsAt: waitEndsAt,
        });

        setPhaseTimerState(waitEndsAt, false);
      }, delayMs);

      return () => {
        clearLocalPhaseTransitionTimer();
      };
    }

    if (phase !== GAME_PHASE.ROUND_RESULT) {
      return;
    }

    const delayMs = Math.max(0, new Date(phaseEndsAt).getTime() - Date.now());

    localPhaseTransitionTimerRef.current = window.setTimeout(() => {
      localPhaseTransitionTimerRef.current = null;

      if (roundNumber >= totalRounds) {
        const gameEndStartedAt = phaseEndsAt;
        const gameEndEndsAt = new Date(
          new Date(gameEndStartedAt).getTime() +
            phaseTimingRef.current.gameEndWaitSec * 1000,
        ).toISOString();

        setRoundState({
          phase: GAME_PHASE.GAME_END,
          roundId: null,
          roundNumber,
          roundDurationSec: phaseTimingRef.current.gameEndWaitSec,
          totalRounds,
          formattedGameEndTime,
          phaseStartedAt: gameEndStartedAt,
          phaseEndsAt: gameEndEndsAt,
        });

        setPhaseTimerState(gameEndEndsAt, true);
        return;
      }

      const waitStartedAt = phaseEndsAt;
      const waitEndsAt = new Date(
        new Date(waitStartedAt).getTime() +
          phaseTimingRef.current.roundStartWaitSec * 1000,
      ).toISOString();

      setRoundState({
        phase: GAME_PHASE.ROUND_START_WAIT,
        roundId: null,
        roundNumber: roundNumber + 1,
        roundDurationSec: phaseTimingRef.current.roundStartWaitSec,
        totalRounds,
        formattedGameEndTime,
        phaseStartedAt: waitStartedAt,
        phaseEndsAt: waitEndsAt,
      });

      setPhaseTimerState(waitEndsAt, false);
    }, delayMs);

    return () => {
      clearLocalPhaseTransitionTimer();
    };
  }, [
    clearLocalPhaseTransitionTimer,
    formattedGameEndTime,
    phase,
    phaseEndsAt,
    roundNumber,
    setPhaseTimerState,
    setRoundState,
    totalRounds,
  ]);

  const handleCanvasJoined = useCallback(() => {
    void refreshParticipants();

    if (roundId && isRoundActivePhase(phase)) {
      void fetchTickets(roundId);
    }
  }, [fetchTickets, phase, refreshParticipants, roundId]);

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
      clearLocalPhaseTransitionTimer();

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
      clearLocalPhaseTransitionTimer,
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
      clearLocalPhaseTransitionTimer();
      clearTickets();
      resetVoteState();

      const resultEndsAt = new Date(
        new Date(endedAt).getTime() +
          phaseTimingRef.current.roundResultDelaySec * 1000,
      ).toISOString();

      setRoundState({
        phase: GAME_PHASE.ROUND_RESULT,
        roundId,
        roundNumber,
        roundDurationSec: phaseTimingRef.current.roundResultDelaySec,
        totalRounds,
        formattedGameEndTime,
        phaseStartedAt: endedAt,
        phaseEndsAt: resultEndsAt,
      });

      setPhaseTimerState(resultEndsAt, true);
    },
    [
      clearLocalPhaseTransitionTimer,
      clearTickets,
      formattedGameEndTime,
      resetVoteState,
      setPhaseTimerState,
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
    clearLocalPhaseTransitionTimer();
    clearTickets();
    clearParticipants();
    resetRoundState();
    resetRoundTimer();
    resetVoteState();
    onSessionEnded();
  }, [
    clearLocalPhaseTransitionTimer,
    clearParticipants,
    clearTickets,
    onSessionEnded,
    resetRoundState,
    resetRoundTimer,
    resetVoteState,
  ]);

  const handleGameEnded = useCallback(() => {
    clearLocalPhaseTransitionTimer();
    markGameEnded();
    clearTickets();
    clearParticipants();
    onGameEndedCleanup();
    resetRoundState();
    resetRoundTimer();
    resetVoteState();
  }, [
    clearLocalPhaseTransitionTimer,
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
    onCanvasBatchUpdated, // 추가: batch update 이벤트 연결
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
