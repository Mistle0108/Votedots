import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useRoundState, useRoundTimer } from "@/features/gameplay/round";
import {
  sessionApi,
  useGameSession,
  useGameplaySocket,
  useParticipantsState,
  type PhaseTimingState,
  type SessionBootstrapResult,
} from "@/features/gameplay/session";
import type {
  GameSummaryData,
  RoundSummaryData,
} from "@/features/gameplay/session/api/session.api";
import type {
  CanvasBatchUpdatedPayload,
  GameSummaryReadyPayload,
  RoundSummaryReadyPayload,
} from "@/features/gameplay/session/model/socket.types";
import {
  GAME_PHASE,
  isRoundActivePhase,
} from "@/features/gameplay/session/model/game-phase.types";
import { captureRoundSnapshot } from "@/features/gameplay/round/model/roundSnapshot.capture";
import {
  clearLatestRoundSnapshot,
  getLatestRoundSnapshot,
  setLatestRoundSnapshot,
} from "@/features/gameplay/round/model/roundSnapshot.storage";
import type { GameConfig } from "@/shared/config/game-config";
import { useVoteTickets } from "@/features/gameplay/vote";

function formatClockTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

interface UseCanvasGameplayParams {
  canvasId: number | null;
  canvasElementRef: RefObject<HTMLCanvasElement | null>;
  onBootstrapScene: (result: SessionBootstrapResult) => void;
  onCanvasUpdated: (payload: { cellId: number; color: string }) => void;
  onCanvasBatchUpdated: (payload: CanvasBatchUpdatedPayload) => void;
  onOpenRoundSummaryModal: (summary: RoundSummaryData) => void;
  onOpenGameSummaryModal: (summary: GameSummaryData) => void;
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
  canvasElementRef,
  onBootstrapScene,
  onCanvasUpdated,
  onCanvasBatchUpdated,
  onOpenRoundSummaryModal,
  onOpenGameSummaryModal,
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
  const snapshotDelayTimerRef = useRef<number | null>(null);
  const pendingRoundResultRef = useRef<{
    roundId: number;
    roundNumber: number;
    summaryReady: boolean;
    canvasApplied: boolean;
    summary: RoundSummaryData | null;
  } | null>(null);
  const [gameConfig, setGameConfigState] = useState<GameConfig | null>(null);
  const [roundSummary, setRoundSummary] = useState<RoundSummaryData | null>(null);
  const [gameSummary, setGameSummary] = useState<GameSummaryData | null>(null);
  const [roundSummaryLoading, setRoundSummaryLoading] = useState(false);
  const [gameSummaryLoading, setGameSummaryLoading] = useState(false);
  const [latestRoundSnapshot, setLatestRoundSnapshotState] = useState<string | null>(
    () => getLatestRoundSnapshot().snapshot,
  );

  const [canOpenLatestRoundSummary, setCanOpenLatestRoundSummary] =
    useState(false);

  const clearLocalPhaseTransitionTimer = useCallback(() => {
    if (localPhaseTransitionTimerRef.current === null) {
      return;
    }

    window.clearTimeout(localPhaseTransitionTimerRef.current);
    localPhaseTransitionTimerRef.current = null;
  }, []);

  const clearSnapshotDelayTimer = useCallback(() => {
    if (snapshotDelayTimerRef.current === null) {
      return;
    }

    window.clearTimeout(snapshotDelayTimerRef.current);
    snapshotDelayTimerRef.current = null;
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

  const requestGameSummary = useCallback(
    async (targetCanvasId: number) => {
      setGameSummaryLoading(true);

      try {
        const response = await sessionApi.getGameSummary(targetCanvasId);
        const nextSummary = response.data.data;

        setGameSummary(nextSummary);
        onOpenGameSummaryModal(nextSummary);
      } catch (error) {
        console.error("[summary] failed to load game summary:", error);
      } finally {
        setGameSummaryLoading(false);
      }
    },
    [onOpenGameSummaryModal],
  );

  const handleGameSummaryReady = useCallback(
    (payload: GameSummaryReadyPayload) => {
      const readyCanvasId = payload.canvasId;

      if (!canvasId || canvasId !== readyCanvasId) {
        return;
      }

      void requestGameSummary(readyCanvasId);
    },
    [canvasId, requestGameSummary],
  );

  const requestRoundSummary = useCallback(
    async (targetCanvasId: number, targetRoundId: number) => {
      setRoundSummaryLoading(true);

      try {
        const response = await sessionApi.getRoundSummary(
          targetCanvasId,
          targetRoundId,
        );

        const nextSummary = response.data.data;
        setRoundSummary(nextSummary);
        return nextSummary;
      } catch (error) {
        console.error("[summary] failed to load round summary:", error);
        return null;
      } finally {
        setRoundSummaryLoading(false);
      }
    },
    [],
  );

  const finalizeRoundSnapshot = useCallback(
    (targetRoundNumber: number) => {
      const canvas = canvasElementRef.current;
      const snapshot = canvas ? captureRoundSnapshot({ canvas }) : null;

      if (!snapshot) {
        clearLatestRoundSnapshot();
        setLatestRoundSnapshotState(null);
        return false;
      }

      const saved = setLatestRoundSnapshot(targetRoundNumber, snapshot);

      if (!saved) {
        clearLatestRoundSnapshot();
        setLatestRoundSnapshotState(null);
        return false;
      }

      setLatestRoundSnapshotState(snapshot);
      return true;
    },
    [canvasElementRef],
  );

  const completePendingRoundResult = useCallback(() => {
    const pending = pendingRoundResultRef.current;

    if (!pending || !pending.summaryReady || !pending.canvasApplied) {
      return;
    }

    clearSnapshotDelayTimer();

    snapshotDelayTimerRef.current = window.setTimeout(() => {
      snapshotDelayTimerRef.current = null;

      const saved = finalizeRoundSnapshot(pending.roundNumber);

      if (pending.summary) {
        onOpenRoundSummaryModal(pending.summary);
      }

      setCanOpenLatestRoundSummary(true);
      pendingRoundResultRef.current = null;

      if (!saved) {
        return;
      }
    }, 500);
  }, [clearSnapshotDelayTimer, finalizeRoundSnapshot, onOpenRoundSummaryModal]);

  const applyBootstrap = useCallback(
    (result: SessionBootstrapResult) => {
      phaseTimingRef.current = result.phaseTiming;
      setGameConfigState(result.gameConfig);
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

      if (
        result.round.phase === GAME_PHASE.ROUND_RESULT &&
        result.round.roundId !== null
      ) {
        void requestRoundSummary(result.canvasId, result.round.roundId);
      }

      if (result.round.phase === GAME_PHASE.GAME_END) {
        void requestGameSummary(result.canvasId);
      }
    },
    [
      applyVoteUpdate,
      onBootstrapScene,
      requestGameSummary,
      requestRoundSummary,
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
      clearSnapshotDelayTimer();
    };
  }, [clearLocalPhaseTransitionTimer, clearSnapshotDelayTimer]);

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
      clearSnapshotDelayTimer();
      pendingRoundResultRef.current = null;
      setGameSummary(null);
      setRoundSummaryLoading(false);
      setGameSummaryLoading(false);

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
      clearSnapshotDelayTimer,
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
      clearSnapshotDelayTimer();
      clearTickets();
      resetVoteState();
      setRoundSummaryLoading(true);
      setCanOpenLatestRoundSummary(false);
      pendingRoundResultRef.current = {
        roundId,
        roundNumber,
        summaryReady: false,
        canvasApplied: false,
        summary: null,
      };

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
      clearSnapshotDelayTimer,
      clearTickets,
      formattedGameEndTime,
      resetVoteState,
      setPhaseTimerState,
      setRoundState,
      totalRounds,
    ],
  );

  const handleRoundSummaryReady = useCallback(
    (payload: RoundSummaryReadyPayload) => {
      const readyCanvasId = payload.canvasId;
      const readyRoundId = payload.roundId;

      if (!canvasId || canvasId !== readyCanvasId) {
        return;
      }

      void requestRoundSummary(readyCanvasId, readyRoundId).then((summary) => {
        if (!summary) {
          return;
        }

        if (
          pendingRoundResultRef.current &&
          pendingRoundResultRef.current.roundId === readyRoundId
        ) {
          pendingRoundResultRef.current = {
            ...pendingRoundResultRef.current,
            summaryReady: true,
            summary,
          };
          completePendingRoundResult();
          return;
        }

        setCanOpenLatestRoundSummary(true);
      });
    },
    [canvasId, completePendingRoundResult, requestRoundSummary],
  );

  const handleSessionEnded = useCallback(() => {
    clearLocalPhaseTransitionTimer();
    clearSnapshotDelayTimer();
    pendingRoundResultRef.current = null;
    setCanOpenLatestRoundSummary(false);
    clearTickets();
    clearParticipants();
    resetRoundState();
    resetRoundTimer();
    resetVoteState();
    setRoundSummary(null);
    setGameSummary(null);
    setRoundSummaryLoading(false);
    setGameSummaryLoading(false);
    onSessionEnded();
  }, [
    clearLocalPhaseTransitionTimer,
    clearParticipants,
    clearSnapshotDelayTimer,
    clearTickets,
    onSessionEnded,
    resetRoundState,
    resetRoundTimer,
    resetVoteState,
  ]);

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

  const handleGameEnded = useCallback(() => {
    clearLocalPhaseTransitionTimer();
    clearSnapshotDelayTimer();
    pendingRoundResultRef.current = null;
    setCanOpenLatestRoundSummary(false);
    markGameEnded();
    clearTickets();
    clearParticipants();
    onGameEndedCleanup();
    resetRoundState();
    resetRoundTimer();
    resetVoteState();
    setRoundSummary(null);
    setGameSummary(null);
    setRoundSummaryLoading(false);
    setGameSummaryLoading(false);
  }, [
    clearLocalPhaseTransitionTimer,
    clearParticipants,
    clearSnapshotDelayTimer,
    clearTickets,
    markGameEnded,
    onGameEndedCleanup,
    resetRoundState,
    resetRoundTimer,
    resetVoteState,
  ]);

  const handleCanvasUpdatedWithSnapshot = useCallback(
    (payload: { cellId: number; color: string }) => {
      onCanvasUpdated(payload);
    },
    [onCanvasUpdated],
  );

  const handleCanvasBatchUpdatedWithSnapshot = useCallback(
    (payload: CanvasBatchUpdatedPayload) => {
      onCanvasBatchUpdated(payload);

      if (!pendingRoundResultRef.current) {
        return;
      }

      pendingRoundResultRef.current = {
        ...pendingRoundResultRef.current,
        canvasApplied: true,
      };

      window.requestAnimationFrame(() => {
        completePendingRoundResult();
      });
    },
    [completePendingRoundResult, onCanvasBatchUpdated],
  );

  useGameplaySocket({
    canvasId,
    onCanvasJoined: handleCanvasJoined,
    onRoundStarted: handleRoundStarted,
    onRoundEnded: handleRoundEnded,
    onRoundSummaryReady: handleRoundSummaryReady,
    onGameSummaryReady: handleGameSummaryReady,
    onCanvasUpdated: handleCanvasUpdatedWithSnapshot,
    onCanvasBatchUpdated: handleCanvasBatchUpdatedWithSnapshot,
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
    gameConfig,
    roundSummary,
    latestRoundSnapshot,
    canOpenLatestRoundSummary,
    gameSummary,
    roundSummaryLoading,
    gameSummaryLoading,
    isRoundExpiredRefValue: isRoundExpired,
  };
}
