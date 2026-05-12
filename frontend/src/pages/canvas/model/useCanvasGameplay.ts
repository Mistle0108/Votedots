import { useCallback, useEffect, useRef, useState } from "react";
import { useRoundState, useRoundTimer } from "@/features/gameplay/round";
import {
  sessionApi,
  useGameSession,
  useGameplaySocket,
  useParticipantsState,
  type SessionBootstrapResult,
} from "@/features/gameplay/session";
import type {
  GameSummaryData,
  ParticipantItem,
  RoundSummaryData,
} from "@/features/gameplay/session/api/session.api";
import type {
  CanvasBatchUpdatedPayload,
  GameSummaryReadyPayload,
  PhaseUpdatedPayload,
  RoundSummaryReadyPayload,
} from "@/features/gameplay/session/model/socket.types";
import {
  GAME_PHASE,
  isRoundActivePhase,
} from "@/features/gameplay/session/model/game-phase.types";
import type { GameConfig } from "@/shared/config/game-config";
import { setGameConfig } from "@/shared/config/game-config";
import { useVoteTickets } from "@/features/gameplay/vote";

function formatClockTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

interface UseCanvasGameplayParams {
  canvasId: number | null;
  onBootstrapScene: (result: SessionBootstrapResult) => void;
  onCanvasUpdated: (payload: { x: number; y: number; color: string }) => void;
  onCanvasBatchUpdated: (payload: CanvasBatchUpdatedPayload) => void;
  onOpenRoundSummaryModal: (summary: RoundSummaryData) => void;
  onOpenGameSummaryModal: (summary: GameSummaryData) => void;
  onRoundStartedCleanup: () => void;
  onRoundEndedCleanup: () => void;
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
  onCanvasBatchUpdated,
  onOpenRoundSummaryModal,
  onOpenGameSummaryModal,
  onRoundStartedCleanup,
  onRoundEndedCleanup,
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
    applyPhaseTimerSnapshot,
    setPhaseTimerState,
    setActiveRoundTimerState,
    resetRoundTimer,
  } = useRoundTimer();

  const hasJoinedCanvasRef = useRef(false);
  const activeRoundTimerRef = useRef<{
    roundEndsAt: string;
    serverOffsetMs: number;
    isRoundExpired: boolean;
  } | null>(null);
  const snapshotDelayTimerRef = useRef<number | null>(null);
  const latestRoundSummaryRequestKeyRef = useRef<string | null>(null);
  const inFlightRoundSummaryRequestRef = useRef<{
    key: string;
    promise: Promise<RoundSummaryData | null>;
  } | null>(null);
  const latestGameSummaryRequestKeyRef = useRef<string | null>(null);
  const inFlightGameSummaryRequestRef = useRef<{
    key: string;
    promise: Promise<GameSummaryData | null>;
  } | null>(null);
  const pendingRoundResultRef = useRef<{
    roundId: number;
    roundNumber: number;
    summaryReady: boolean;
    canvasApplied: boolean;
    summary: RoundSummaryData | null;
  } | null>(null);
  const [gameConfig, setGameConfigState] = useState<GameConfig | null>(null);
  const [roundSummary, setRoundSummary] = useState<RoundSummaryData | null>(
    null,
  );
  const [gameSummary, setGameSummary] = useState<GameSummaryData | null>(null);
  const [roundSummaryLoading, setRoundSummaryLoading] = useState(false);
  const [gameSummaryLoading, setGameSummaryLoading] = useState(false);
  const [latestRoundSnapshot, setLatestRoundSnapshotState] = useState<
    string | null
  >(null);

  const [canOpenLatestRoundSummary, setCanOpenLatestRoundSummary] =
    useState(false);

  const clearSnapshotDelayTimer = useCallback(() => {
    if (snapshotDelayTimerRef.current === null) {
      return;
    }

    window.clearTimeout(snapshotDelayTimerRef.current);
    snapshotDelayTimerRef.current = null;
  }, []);

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

  const { remaining, applyRemainingSnapshot, fetchTickets, clearTickets } =
    useVoteTickets();

  const {
    participantCount,
    participants,
    participantLoading,
    participantError,
    participantSummary,
    refreshParticipants,
    applyParticipantsSnapshot,
    clearParticipants,
  } = useParticipantsState();

  const requestGameSummary = useCallback(
    async (targetCanvasId: number) => {
      const requestKey = `canvas:${targetCanvasId}`;
      latestGameSummaryRequestKeyRef.current = requestKey;

      if (inFlightGameSummaryRequestRef.current?.key === requestKey) {
        return inFlightGameSummaryRequestRef.current.promise;
      }

      setGameSummaryLoading(true);

      const promise = (async () => {
        try {
          const response = await sessionApi.getGameSummary(targetCanvasId);
          const nextSummary = response.data.data;

          if (latestGameSummaryRequestKeyRef.current === requestKey) {
            setGameSummary(nextSummary);
          }

          return nextSummary;
        } catch (error) {
          if (latestGameSummaryRequestKeyRef.current === requestKey) {
            setGameSummary(null);
          }

          console.error("[summary] failed to load game summary:", error);
          return null;
        } finally {
          if (latestGameSummaryRequestKeyRef.current === requestKey) {
            setGameSummaryLoading(false);
          }

          if (inFlightGameSummaryRequestRef.current?.key === requestKey) {
            inFlightGameSummaryRequestRef.current = null;
          }
        }
      })();

      inFlightGameSummaryRequestRef.current = {
        key: requestKey,
        promise,
      };

      return promise;
    },
    [],
  );

  const handleGameSummaryReady = useCallback(
    (payload: GameSummaryReadyPayload) => {
      const readyCanvasId = payload.canvasId;

      if (!canvasId || canvasId !== readyCanvasId) {
        return;
      }

      void requestGameSummary(readyCanvasId).then((summary) => {
        if (summary) {
          onOpenGameSummaryModal(summary);
        }
      });
    },
    [canvasId, onOpenGameSummaryModal, requestGameSummary],
  );

  const requestRoundSummary = useCallback(
    async (targetCanvasId: number, targetRoundId: number) => {
      const requestKey = `canvas:${targetCanvasId}:round:${targetRoundId}`;
      latestRoundSummaryRequestKeyRef.current = requestKey;

      if (inFlightRoundSummaryRequestRef.current?.key === requestKey) {
        return inFlightRoundSummaryRequestRef.current.promise;
      }

      setRoundSummaryLoading(true);

      const promise = (async () => {
        try {
          const response = await sessionApi.getRoundSummary(
            targetCanvasId,
            targetRoundId,
          );

          const nextSummary = response.data.data;

          if (latestRoundSummaryRequestKeyRef.current === requestKey) {
            setRoundSummary(nextSummary);
            setLatestRoundSnapshotState(nextSummary.snapshotUrl);
          }

          return nextSummary;
        } catch (error) {
          if (latestRoundSummaryRequestKeyRef.current === requestKey) {
            setLatestRoundSnapshotState(null);
          }

          console.error("[summary] failed to load round summary:", error);
          return null;
        } finally {
          if (latestRoundSummaryRequestKeyRef.current === requestKey) {
            setRoundSummaryLoading(false);
          }

          if (inFlightRoundSummaryRequestRef.current?.key === requestKey) {
            inFlightRoundSummaryRequestRef.current = null;
          }
        }
      })();

      inFlightRoundSummaryRequestRef.current = {
        key: requestKey,
        promise,
      };

      return promise;
    },
    [],
  );

  const completePendingRoundResult = useCallback(() => {
    const pending = pendingRoundResultRef.current;

    if (!pending || !pending.summaryReady || !pending.canvasApplied) {
      return;
    }

    clearSnapshotDelayTimer();

    snapshotDelayTimerRef.current = window.setTimeout(() => {
      snapshotDelayTimerRef.current = null;

      setLatestRoundSnapshotState(pending.summary?.snapshotUrl ?? null);

      if (pending.summary) {
        onOpenRoundSummaryModal(pending.summary);
      }

      setCanOpenLatestRoundSummary(true);
      pendingRoundResultRef.current = null;
    }, 150);
  }, [clearSnapshotDelayTimer, onOpenRoundSummaryModal]);

  const applyBootstrap = useCallback(
    (result: SessionBootstrapResult) => {
      setGameConfig(result.gameConfig);
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
        if (result.round.phaseEndsAt && result.round.timerServerNow) {
          syncActiveRoundTimer({
            roundEndsAt: result.round.phaseEndsAt,
            serverNow: result.round.timerServerNow,
            isRoundExpired: result.round.isRoundExpired,
          });
        } else {
          setRoundTimerState({
            remainingSeconds: result.round.remainingSeconds,
            formattedRemainingTime: result.round.formattedRemainingTime,
            isRoundExpired: result.round.isRoundExpired,
          });
        }
      } else {
        clearActiveRoundTimer();

        if (result.round.phaseEndsAt) {
          setPhaseTimerState(
            result.round.phaseEndsAt,
            result.round.isRoundExpired,
          );
        } else {
          applyPhaseTimerSnapshot(
            result.round.remainingSeconds,
            result.round.isRoundExpired,
          );
        }
      }

      applyVoteUpdate(result.votes);
      applyRemainingSnapshot(result.round.roundId, result.remaining);

      if (
        result.round.phase === GAME_PHASE.ROUND_RESULT &&
        result.round.roundId !== null
      ) {
        void requestRoundSummary(result.canvasId, result.round.roundId);
      }

      if (result.round.phase === GAME_PHASE.GAME_END) {
        void requestGameSummary(result.canvasId).then((summary) => {
          if (summary) {
            onOpenGameSummaryModal(summary);
          }
        });
      }
    },
    [
      applyRemainingSnapshot,
      applyVoteUpdate,
      onBootstrapScene,
      onOpenGameSummaryModal,
      requestGameSummary,
      requestRoundSummary,
      applyPhaseTimerSnapshot,
      clearActiveRoundTimer,
      syncActiveRoundTimer,
      setPhaseTimerState,
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
      clearSnapshotDelayTimer();
    };
  }, [clearSnapshotDelayTimer]);

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
    hasJoinedCanvasRef.current = false;
    clearActiveRoundTimer();
    clearParticipants();
  }, [canvasId, clearActiveRoundTimer, clearParticipants]);

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
    ({ restored }: { restored: boolean }) => {
      const isInitialJoin = !hasJoinedCanvasRef.current;

      hasJoinedCanvasRef.current = true;

      if (!isInitialJoin && !restored) {
        return;
      }

      void refreshParticipants();
    },
    [refreshParticipants],
  );

  const handleRoundStarted = useCallback(
    async ({
      roundId,
      roundNumber,
      totalRounds,
      gameEndAt,
      roundDurationSec,
      startedAt,
      roundEndsAt,
      serverNow,
    }: {
      roundId: number;
      roundNumber: number;
      startedAt: string;
      roundEndsAt: string;
      serverNow: string;
      roundDurationSec: number;
      totalRounds: number;
      gameEndAt: string;
    }) => {
      clearSnapshotDelayTimer();
      pendingRoundResultRef.current = null;
      setGameSummary(null);
      setRoundSummaryLoading(false);
      setGameSummaryLoading(false);
      onRoundStartedCleanup();

      setRoundState({
        phase: GAME_PHASE.ROUND_ACTIVE,
        roundId,
        roundNumber,
        roundDurationSec,
        totalRounds,
        formattedGameEndTime: formatClockTime(new Date(gameEndAt)),
        phaseStartedAt: startedAt,
        phaseEndsAt: roundEndsAt,
      });

      syncActiveRoundTimer({
        roundEndsAt,
        serverNow,
        isRoundExpired: false,
      });
      clearSessionError();
      resetVoteState();
      applyParticipantsSnapshot(
        participants.length,
        participants.map((participant) => ({
          ...participant,
          selectedCell: null,
        })),
      );

      await fetchTickets(roundId);
    },
    [
      applyParticipantsSnapshot,
      clearSessionError,
      clearSnapshotDelayTimer,
      fetchTickets,
      onRoundStartedCleanup,
      participants,
      resetVoteState,
      setRoundState,
      syncActiveRoundTimer,
    ],
  );

  const handleRoundEnded = useCallback(
    ({
      roundId,
      roundNumber,
    }: {
      roundId: number;
      roundNumber: number;
    }) => {
      clearActiveRoundTimer();
      clearSnapshotDelayTimer();
      onRoundEndedCleanup();
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
    },
    [
      clearActiveRoundTimer,
      clearSnapshotDelayTimer,
      onRoundEndedCleanup,
      clearTickets,
      resetVoteState,
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

  const handleSessionEnded = useCallback(() => {
    clearActiveRoundTimer();
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
    clearActiveRoundTimer,
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
      isRoundExpired,
      serverNow,
      roundEndsAt,
      gameEndAt,
      roundDurationSec,
      totalRounds,
    }: {
      isRoundExpired: boolean;
      serverNow: string;
      roundEndsAt: string;
      gameEndAt: string;
      roundDurationSec: number;
      totalRounds: number;
    }) => {
      syncActiveRoundTimer({
        roundEndsAt,
        serverNow,
        isRoundExpired,
      });
      applyRoundMeta({ roundDurationSec, totalRounds, gameEndAt });
    },
    [applyRoundMeta, syncActiveRoundTimer],
  );

  const handleParticipantsUpdated = useCallback(
    ({
      count,
      participants: nextParticipants,
    }: {
      canvasId: number;
      count: number;
      participants: ParticipantItem[];
    }) => {
      applyParticipantsSnapshot(count, nextParticipants);
    },
    [applyParticipantsSnapshot],
  );

  const handleGameEnded = useCallback(() => {
    clearActiveRoundTimer();
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
    clearActiveRoundTimer,
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
    (payload: { x: number; y: number; color: string }) => {
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
    onPhaseUpdated: handlePhaseUpdated,
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
