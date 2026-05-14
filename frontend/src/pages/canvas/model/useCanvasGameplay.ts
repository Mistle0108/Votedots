import { useCallback, useEffect, useRef, useState } from "react";
import { useRoundState, useRoundTimer } from "@/features/gameplay/round";
import {
  useGameSession,
  useGameplayBootstrap,
  useGameplaySocket,
  useParticipantsState,
  type SessionBootstrapResult,
} from "@/features/gameplay/session";
import type { GameplaySessionSourceApi } from "@/features/gameplay/session/api/session-source.api";
import type { ParticipantItem } from "@/features/gameplay/session/api/session.api";
import type {
  CanvasBatchUpdatedPayload,
  RoundStartedPayload,
} from "@/features/gameplay/session/model/socket.types";
import {
  GAME_PHASE,
  isRoundActivePhase,
} from "@/features/gameplay/session/model/game-phase.types";
import type { GameConfig } from "@/shared/config/game-config";
import { setGameConfig } from "@/shared/config/game-config";
import { useVoteTickets } from "@/features/gameplay/vote";
import useGameplaySummaries from "../hooks/useGameplaySummaries";
import useGameplayPhaseSync from "../hooks/useGameplayPhaseSync";
import useGameplaySessionCleanup from "../hooks/useGameplaySessionCleanup";

function formatClockTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

interface UseCanvasGameplayParams {
  canvasId: number | null;
  sessionSourceApi: GameplaySessionSourceApi;
  onBootstrapScene: (result: SessionBootstrapResult) => void;
  onCanvasUpdated: (payload: { x: number; y: number; color: string }) => void;
  onCanvasBatchUpdated: (payload: CanvasBatchUpdatedPayload) => void;
  onRoundStartedCleanup: () => void;
  onRoundEndedCleanup: () => void;
  onGameEndedCleanup: () => void;
  onSessionEnded: () => void;
  onContextMissing?: () => void;
  onUnauthorized: (message: string) => void;
  applyVoteUpdate: (votes: Record<string, number>) => void;
  resetVoteState: () => void;
}

export default function useCanvasGameplay({
  canvasId,
  sessionSourceApi,
  onBootstrapScene,
  onCanvasUpdated,
  onCanvasBatchUpdated,
  onRoundStartedCleanup,
  onRoundEndedCleanup,
  onGameEndedCleanup,
  onSessionEnded,
  onContextMissing,
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

  const [gameConfig, setGameConfigState] = useState<GameConfig | null>(null);
  const { bootstrap } = useGameplayBootstrap({ sessionSourceApi });

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
  } = useParticipantsState({ sessionSourceApi });
  const silentSessionResyncRef = useRef<() => Promise<unknown>>(
    async () => null,
  );

  const summaries = useGameplaySummaries({ canvasId });
  const {
    roundSummary,
    latestRoundSnapshot,
    canOpenLatestRoundSummary,
    gameSummary,
    roundSummaryEvent,
    gameSummaryEvent,
    roundSummaryLoading,
    gameSummaryLoading,
    handleBootstrapSummaryRequests,
    handleRoundSummaryReady,
    handleGameSummaryReady,
    beginPendingRoundResult,
    markPendingRoundResultCanvasApplied,
    resetForRoundStart,
    resetAll: resetSummaries,
  } = summaries;
  const phaseSync = useGameplayPhaseSync({
    canvasId,
    phase,
    phaseEndsAt,
    formattedGameEndTime,
    refreshParticipants,
    resyncSession: () => silentSessionResyncRef.current(),
    clearTickets,
    resetVoteState,
    onRoundEndedCleanup,
    setRoundState,
    applyPhaseTimerSnapshot,
    setPhaseTimerState,
    setActiveRoundTimerState,
    applyRoundMeta,
    beginPendingRoundResult,
  });
  const {
    clearActiveRoundTimer,
    syncActiveRoundTimer,
    syncPhaseTimer,
    resetJoinedState,
    handleCanvasJoined,
    handleRoundEnded,
    handlePhaseUpdated,
    handleTimerUpdate,
  } = phaseSync;

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

        if (result.round.phaseEndsAt && result.round.timerServerNow) {
          syncPhaseTimer({
            phaseEndsAt: result.round.phaseEndsAt,
            serverNow: result.round.timerServerNow,
            isRoundExpired: result.round.isRoundExpired,
          });
        } else if (result.round.phaseEndsAt) {
          setPhaseTimerState(result.round.phaseEndsAt, 0, result.round.isRoundExpired);
        } else {
          applyPhaseTimerSnapshot(
            result.round.remainingSeconds,
            result.round.isRoundExpired,
          );
        }
      }

      applyVoteUpdate(result.votes);
      applyRemainingSnapshot(result.round.roundId, result.remaining);
      handleBootstrapSummaryRequests(result);
    },
    [
      applyRemainingSnapshot,
      applyVoteUpdate,
      clearActiveRoundTimer,
      handleBootstrapSummaryRequests,
      onBootstrapScene,
      applyPhaseTimerSnapshot,
      setPhaseTimerState,
      setRoundState,
      setRoundTimerState,
      syncActiveRoundTimer,
      syncPhaseTimer,
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
    bootstrap,
    onBootstrap: applyBootstrap,
    onUnauthorized,
    onContextMissing:
      sessionSourceApi.key === "room" ? onContextMissing : undefined,
  });

  useEffect(() => {
    silentSessionResyncRef.current = () => initializeSession({ silent: true });
  }, [initializeSession]);

  const sessionCleanup = useGameplaySessionCleanup({
    clearActiveRoundTimer,
    clearTickets,
    clearParticipants,
    resetRoundState,
    resetRoundTimer,
    resetVoteState,
    resetSummaries,
    markGameEnded,
    onGameEndedCleanup,
    onSessionEnded,
  });

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
    resetJoinedState();
    clearParticipants();
  }, [canvasId, clearParticipants, resetJoinedState]);

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
    }: RoundStartedPayload) => {
      resetForRoundStart();
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
      fetchTickets,
      onRoundStartedCleanup,
      participants,
      resetVoteState,
      setRoundState,
      resetForRoundStart,
      syncActiveRoundTimer,
    ],
  );

  const handleVoteUpdate = useCallback(
    ({ votes }: { votes: Record<string, number> }) => {
      applyVoteUpdate(votes);
    },
    [applyVoteUpdate],
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

  const handleCanvasUpdatedWithSnapshot = useCallback(
    (payload: { x: number; y: number; color: string }) => {
      onCanvasUpdated(payload);
    },
    [onCanvasUpdated],
  );

  const handleCanvasBatchUpdatedWithSnapshot = useCallback(
    (payload: CanvasBatchUpdatedPayload) => {
      onCanvasBatchUpdated(payload);
      markPendingRoundResultCanvasApplied();
    },
    [markPendingRoundResultCanvasApplied, onCanvasBatchUpdated],
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
    onSessionEnded: sessionCleanup.handleSessionEnded,
    onGameEnded: sessionCleanup.handleGameEnded,
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
    roundSummaryEvent,
    gameSummaryEvent,
    roundSummaryLoading,
    gameSummaryLoading,
    isRoundExpiredRefValue: isRoundExpired,
  };
}
