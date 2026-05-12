import { useCallback, useEffect, useRef, useState } from "react";
import { sessionApi } from "@/features/gameplay/session";
import type {
  GameSummaryData,
  RoundSummaryData,
} from "@/features/gameplay/session/api/session.api";
import type {
  GameSummaryReadyPayload,
  RoundSummaryReadyPayload,
} from "@/features/gameplay/session/model/socket.types";
import { GAME_PHASE } from "@/features/gameplay/session/model/game-phase.types";
import type { SessionBootstrapResult } from "@/features/gameplay/session";

interface UseGameplaySummariesParams {
  canvasId: number | null;
}

export default function useGameplaySummaries({
  canvasId,
}: UseGameplaySummariesParams) {
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
  const roundSummaryEventSequenceRef = useRef(0);
  const gameSummaryEventSequenceRef = useRef(0);

  const [roundSummary, setRoundSummary] = useState<RoundSummaryData | null>(
    null,
  );
  const [gameSummary, setGameSummary] = useState<GameSummaryData | null>(null);
  const [roundSummaryLoading, setRoundSummaryLoading] = useState(false);
  const [gameSummaryLoading, setGameSummaryLoading] = useState(false);
  const [latestRoundSnapshot, setLatestRoundSnapshotState] = useState<
    string | null
  >(null);
  const [roundSummaryEvent, setRoundSummaryEvent] = useState<{
    sequence: number;
    summary: RoundSummaryData;
  } | null>(null);
  const [gameSummaryEvent, setGameSummaryEvent] = useState<{
    sequence: number;
    summary: GameSummaryData;
  } | null>(null);
  const [canOpenLatestRoundSummary, setCanOpenLatestRoundSummary] =
    useState(false);

  const clearSnapshotDelayTimer = useCallback(() => {
    if (snapshotDelayTimerRef.current === null) {
      return;
    }

    window.clearTimeout(snapshotDelayTimerRef.current);
    snapshotDelayTimerRef.current = null;
  }, []);

  const publishGameSummary = useCallback((summary: GameSummaryData) => {
    gameSummaryEventSequenceRef.current += 1;
    setGameSummaryEvent({
      sequence: gameSummaryEventSequenceRef.current,
      summary,
    });
  }, []);

  const publishRoundSummary = useCallback((summary: RoundSummaryData) => {
    roundSummaryEventSequenceRef.current += 1;
    setRoundSummaryEvent({
      sequence: roundSummaryEventSequenceRef.current,
      summary,
    });
  }, []);

  const requestGameSummary = useCallback(async (targetCanvasId: number) => {
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
  }, []);

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
        publishRoundSummary(pending.summary);
      }

      setCanOpenLatestRoundSummary(true);
      pendingRoundResultRef.current = null;
    }, 150);
  }, [clearSnapshotDelayTimer, publishRoundSummary]);

  const beginPendingRoundResult = useCallback(
    (roundId: number, roundNumber: number) => {
      clearSnapshotDelayTimer();
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
    [clearSnapshotDelayTimer],
  );

  const markPendingRoundResultCanvasApplied = useCallback(() => {
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
  }, [completePendingRoundResult]);

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

  const handleGameSummaryReady = useCallback(
    (payload: GameSummaryReadyPayload) => {
      const readyCanvasId = payload.canvasId;

      if (!canvasId || canvasId !== readyCanvasId) {
        return;
      }

      void requestGameSummary(readyCanvasId).then((summary) => {
        if (summary) {
          publishGameSummary(summary);
        }
      });
    },
    [canvasId, publishGameSummary, requestGameSummary],
  );

  const handleBootstrapSummaryRequests = useCallback(
    (result: SessionBootstrapResult) => {
      if (
        result.round.phase === GAME_PHASE.ROUND_RESULT &&
        result.round.roundId !== null
      ) {
        void requestRoundSummary(result.canvasId, result.round.roundId);
      }

      if (result.round.phase === GAME_PHASE.GAME_END) {
        void requestGameSummary(result.canvasId).then((summary) => {
          if (summary) {
            publishGameSummary(summary);
          }
        });
      }
    },
    [publishGameSummary, requestGameSummary, requestRoundSummary],
  );

  const resetForRoundStart = useCallback(() => {
    clearSnapshotDelayTimer();
    pendingRoundResultRef.current = null;
    setGameSummary(null);
    setRoundSummaryLoading(false);
    setGameSummaryLoading(false);
  }, [clearSnapshotDelayTimer]);

  const resetAll = useCallback(() => {
    clearSnapshotDelayTimer();
    pendingRoundResultRef.current = null;
    setCanOpenLatestRoundSummary(false);
    setRoundSummary(null);
    setGameSummary(null);
    setRoundSummaryEvent(null);
    setGameSummaryEvent(null);
    setRoundSummaryLoading(false);
    setGameSummaryLoading(false);
    setLatestRoundSnapshotState(null);
  }, [clearSnapshotDelayTimer]);

  useEffect(() => {
    return () => {
      clearSnapshotDelayTimer();
    };
  }, [clearSnapshotDelayTimer]);

  return {
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
    resetAll,
  };
}
