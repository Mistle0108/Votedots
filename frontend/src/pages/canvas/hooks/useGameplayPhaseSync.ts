import { useCallback, useEffect, useRef } from "react";
import type {
  CanvasJoinedPayload,
  PhaseUpdatedPayload,
  RoundEndedPayload,
  TimerUpdatePayload,
} from "@/features/gameplay/session/model/socket.types";
import {
  GAME_PHASE,
  isRoundActivePhase,
} from "@/features/gameplay/session/model/game-phase.types";
import type { GamePhase } from "@/features/gameplay/session/model/game-phase.types";

interface UseGameplayPhaseSyncParams {
  canvasId: number | null;
  phase: GamePhase;
  phaseEndsAt: string | null;
  formattedGameEndTime: string | null;
  refreshParticipants: () => Promise<unknown>;
  resyncSession: () => Promise<unknown>;
  clearTickets: () => void;
  resetVoteState: () => void;
  onRoundEndedCleanup: () => void;
  setRoundState: (state: {
    phase: GamePhase;
    roundId: number | null;
    roundNumber: number | null;
    roundDurationSec: number | null;
    totalRounds: number;
    formattedGameEndTime: string | null;
    phaseStartedAt: string | null;
    phaseEndsAt: string | null;
  }) => void;
  applyPhaseTimerSnapshot: (
    remainingSeconds: number | null,
    expired: boolean,
  ) => void;
  setPhaseTimerState: (phaseEndsAt: string | null, expired: boolean) => void;
  setActiveRoundTimerState: (
    roundEndsAt: string | null,
    serverOffsetMs: number,
    expired: boolean,
  ) => void;
  applyRoundMeta: (timer: {
    roundDurationSec: number;
    totalRounds: number;
    gameEndAt: string;
  }) => void;
  beginPendingRoundResult: (roundId: number, roundNumber: number) => void;
}

export default function useGameplayPhaseSync({
  canvasId,
  phase,
  phaseEndsAt,
  formattedGameEndTime,
  refreshParticipants,
  resyncSession,
  clearTickets,
  resetVoteState,
  onRoundEndedCleanup,
  setRoundState,
  applyPhaseTimerSnapshot,
  setPhaseTimerState,
  setActiveRoundTimerState,
  applyRoundMeta,
  beginPendingRoundResult,
}: UseGameplayPhaseSyncParams) {
  const hasJoinedCanvasRef = useRef(false);
  const activeRoundTimerRef = useRef<{
    roundEndsAt: string;
    serverOffsetMs: number;
    isRoundExpired: boolean;
  } | null>(null);

  const clearActiveRoundTimer = useCallback(() => {
    activeRoundTimerRef.current = null;
  }, []);

  const syncActiveRoundTimer = useCallback(
    ({
      roundEndsAt,
      serverNow,
      isRoundExpired,
    }: {
      roundEndsAt: string;
      serverNow: string;
      isRoundExpired: boolean;
    }) => {
      const serverOffsetMs = new Date(serverNow).getTime() - Date.now();

      activeRoundTimerRef.current = {
        roundEndsAt,
        serverOffsetMs,
        isRoundExpired,
      };

      setActiveRoundTimerState(roundEndsAt, serverOffsetMs, isRoundExpired);
    },
    [setActiveRoundTimerState],
  );

  const resetJoinedState = useCallback(() => {
    hasJoinedCanvasRef.current = false;
    clearActiveRoundTimer();
  }, [clearActiveRoundTimer]);

  useEffect(() => {
    if (!isRoundActivePhase(phase)) {
      return;
    }

    const syncTimer = () => {
      const timerState = activeRoundTimerRef.current;

      if (!timerState) {
        return;
      }

      setActiveRoundTimerState(
        timerState.roundEndsAt,
        timerState.serverOffsetMs,
        timerState.isRoundExpired,
      );
    };

    syncTimer();

    const timer = window.setInterval(syncTimer, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [phase, setActiveRoundTimerState]);

  useEffect(() => {
    if (isRoundActivePhase(phase)) {
      return;
    }

    if (!phaseEndsAt) {
      return;
    }

    const expired =
      phase === GAME_PHASE.ROUND_RESULT || phase === GAME_PHASE.GAME_END;

    setPhaseTimerState(phaseEndsAt, expired);

    const timer = window.setInterval(() => {
      setPhaseTimerState(phaseEndsAt, expired);
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [phase, phaseEndsAt, setPhaseTimerState]);

  const handleCanvasJoined = useCallback(
    ({ restored }: CanvasJoinedPayload) => {
      const isInitialJoin = !hasJoinedCanvasRef.current;

      hasJoinedCanvasRef.current = true;

      if (!isInitialJoin && !restored) {
        return;
      }

      void refreshParticipants();
      void resyncSession();
    },
    [refreshParticipants, resyncSession],
  );

  const handleRoundEnded = useCallback(
    ({ roundId, roundNumber }: RoundEndedPayload) => {
      clearActiveRoundTimer();
      onRoundEndedCleanup();
      clearTickets();
      resetVoteState();
      beginPendingRoundResult(roundId, roundNumber);
    },
    [
      beginPendingRoundResult,
      clearActiveRoundTimer,
      clearTickets,
      onRoundEndedCleanup,
      resetVoteState,
    ],
  );

  const handlePhaseUpdated = useCallback(
    ({
      canvasId: updatedCanvasId,
      phase: nextPhase,
      roundId: nextRoundId,
      roundNumber: nextRoundNumber,
      roundDurationSec: nextRoundDurationSec,
      remainingSeconds: nextRemainingSeconds,
      totalRounds: nextTotalRounds,
      phaseStartedAt: nextPhaseStartedAt,
      phaseEndsAt: nextPhaseEndsAt,
    }: PhaseUpdatedPayload) => {
      if (!canvasId || canvasId !== updatedCanvasId) {
        return;
      }

      if (nextPhase === GAME_PHASE.ROUND_ACTIVE) {
        return;
      }

      clearActiveRoundTimer();

      setRoundState({
        phase: nextPhase,
        roundId: nextRoundId,
        roundNumber: nextRoundNumber,
        roundDurationSec: nextRoundDurationSec,
        totalRounds: nextTotalRounds,
        formattedGameEndTime,
        phaseStartedAt: nextPhaseStartedAt,
        phaseEndsAt: nextPhaseEndsAt,
      });

      if (nextRemainingSeconds !== null) {
        if (nextPhaseEndsAt) {
          setPhaseTimerState(
            nextPhaseEndsAt,
            nextPhase === GAME_PHASE.GAME_END && nextRemainingSeconds === 0,
          );
        } else {
          applyPhaseTimerSnapshot(
            nextRemainingSeconds,
            nextPhase === GAME_PHASE.GAME_END && nextRemainingSeconds === 0,
          );
        }
        return;
      }

      setPhaseTimerState(
        nextPhaseEndsAt,
        nextPhase === GAME_PHASE.GAME_END && nextRemainingSeconds === 0,
      );
    },
    [
      applyPhaseTimerSnapshot,
      canvasId,
      clearActiveRoundTimer,
      formattedGameEndTime,
      setPhaseTimerState,
      setRoundState,
    ],
  );

  const handleTimerUpdate = useCallback(
    ({
      isRoundExpired,
      serverNow,
      roundEndsAt,
      gameEndAt,
      roundDurationSec,
      totalRounds,
    }: TimerUpdatePayload) => {
      syncActiveRoundTimer({
        roundEndsAt,
        serverNow,
        isRoundExpired,
      });
      applyRoundMeta({ roundDurationSec, totalRounds, gameEndAt });
    },
    [applyRoundMeta, syncActiveRoundTimer],
  );

  return {
    clearActiveRoundTimer,
    syncActiveRoundTimer,
    resetJoinedState,
    handleCanvasJoined,
    handleRoundEnded,
    handlePhaseUpdated,
    handleTimerUpdate,
  };
}
