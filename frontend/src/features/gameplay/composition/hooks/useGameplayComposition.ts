import { useCallback, useEffect, useRef, useState } from "react";
import {
  CELL_SIZE,
  type Cell,
  useCanvasInteraction,
  useCanvasNavigation,
  useCanvasRenderer,
  useCanvasViewport,
} from "@/features/gameplay/canvas";
import {
  type CanvasUpdatedPayload,
  type RoundStartedPayload,
  type SessionBootstrapResult,
  type TimerUpdatePayload,
  type VoteUpdatePayload,
  useGameSession,
  useGameplaySocket,
} from "@/features/gameplay/session";
import { useRoundState, useRoundTimer } from "@/features/gameplay/round";
import type { RoundInfo as RoundData } from "@/features/gameplay/round/model/round.types";
import { useVotePopupState, useVoteState } from "@/features/gameplay/vote";

export function useGameplayComposition() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cellsRef = useRef<Cell[]>([]);
  const selectedCellRef = useRef<Cell | null>(null);
  const previewColorRef = useRef<string | null>(null);
  const votingCellIdsRef = useRef<Set<number>>(new Set());
  const topColorMapRef = useRef<Map<number, string>>(new Map());
  const isRoundExpiredRef = useRef(false);

  const [cells, setCells] = useState<Cell[]>([]);
  const [canvasId, setCanvasId] = useState<number | null>(null);
  const [gridX, setGridX] = useState(0);
  const [gridY, setGridY] = useState(0);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const {
    roundId,
    roundNumber,
    roundDurationSec,
    totalRounds,
    formattedGameEndTime,
    applyRoundState,
    applyRoundMeta,
    resetRoundState,
  } = useRoundState();

  const {
    remainingSeconds,
    formattedRemainingTime,
    isRoundExpired,
    applyRoundTimer,
    startRoundTimer,
    expireRoundTimer,
    resetRoundTimer,
  } = useRoundTimer();

  const {
    votes,
    remaining,
    previewColor,
    votingCellIds,
    topColorMap,
    setRemaining,
    handleVoteUpdate: applyVoteUpdate,
    handleRoundStarted: startVoteRound,
    handleRoundEnded: endVoteRound,
    handleVoteSuccess: refreshVoteTickets,
    handleColorChange,
    resetPreviewColor,
    resetVotes,
  } = useVoteState();

  const { popupOpen, popupPos, openPopup, closePopup } = useVotePopupState();

  useEffect(() => {
    selectedCellRef.current = selectedCell;
  }, [selectedCell]);

  useEffect(() => {
    previewColorRef.current = previewColor;
  }, [previewColor]);

  useEffect(() => {
    votingCellIdsRef.current = votingCellIds;
  }, [votingCellIds]);

  useEffect(() => {
    topColorMapRef.current = topColorMap;
  }, [topColorMap]);

  useEffect(() => {
    isRoundExpiredRef.current = isRoundExpired;
  }, [isRoundExpired]);

  const updateCells = useCallback(
    (updater: Cell[] | ((prev: Cell[]) => Cell[])) => {
      if (typeof updater === "function") {
        setCells((prev) => {
          const next = updater(prev);
          cellsRef.current = next;
          return next;
        });
      } else {
        cellsRef.current = updater;
        setCells(updater);
      }
    },
    [],
  );

  const clearSelectedCell = useCallback(() => {
    setSelectedCell(null);
    selectedCellRef.current = null;
  }, []);

  const applyBootstrap = useCallback(
    (result: SessionBootstrapResult) => {
      setCanvasReady(false);
      setCanvasId(result.canvasId);
      setGridX(result.gridX);
      setGridY(result.gridY);
      updateCells(result.cells);

      if (result.round) {
        applyRoundState(result.round);
      } else {
        resetRoundState();
      }

      if (result.timer) {
        applyRoundTimer(result.timer);
      } else {
        resetRoundTimer();
      }

      resetVotes();
      resetPreviewColor();
      setRemaining(result.remaining);
      clearSelectedCell();
      closePopup();
    },
    [
      applyRoundState,
      applyRoundTimer,
      clearSelectedCell,
      closePopup,
      resetPreviewColor,
      resetRoundState,
      resetRoundTimer,
      resetVotes,
      setRemaining,
      updateCells,
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
    void initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !canvasId || gridX === 0 || gridY === 0) {
      setCanvasReady(false);
      return;
    }

    canvas.width = gridX * CELL_SIZE;
    canvas.height = gridY * CELL_SIZE;
    setCanvasReady(true);
  }, [canvasId, gridX, gridY]);

  const { viewport, updateViewport } = useCanvasViewport({
    containerRef,
    canvasRef,
    gridX,
    gridY,
    canvasReady,
  });

  const { navigateToCoordinate } = useCanvasNavigation({
    containerRef,
    canvasRef,
    updateViewport,
  });

  useCanvasRenderer({
    canvasRef,
    canvasReady,
    cellsRef,
    selectedCellRef,
    previewColorRef,
    votingCellIdsRef,
    topColorMapRef,
  });

  const handleSelectCell = useCallback((cell: Cell) => {
    setSelectedCell(cell);
    selectedCellRef.current = cell;
  }, []);

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } =
    useCanvasInteraction({
      containerRef,
      canvasRef,
      cells,
      onSelectCell: handleSelectCell,
      onResetPreviewColor: resetPreviewColor,
      onOpenPopup: openPopup,
    });

  const handleRoundStarted = useCallback(
    ({
      roundId,
      roundNumber,
      startedAt,
      roundDurationSec,
      totalRounds,
      gameEndAt,
    }: RoundStartedPayload) => {
      const nextRound: RoundData = {
        id: roundId,
        roundNumber,
        startedAt,
        endedAt: null,
        roundDurationSec,
        totalRounds,
        gameEndAt,
      };

      applyRoundState(nextRound);
      startRoundTimer(roundDurationSec);
      clearSessionError();
      void startVoteRound(roundId);
    },
    [applyRoundState, clearSessionError, startRoundTimer, startVoteRound],
  );

  const handleRoundEnded = useCallback(() => {
    expireRoundTimer();
    endVoteRound();
  }, [endVoteRound, expireRoundTimer]);

  const handleCanvasUpdated = useCallback(
    ({ cellId, color }: CanvasUpdatedPayload) => {
      updateCells((prev) =>
        prev.map((cell) =>
          cell.id === cellId ? { ...cell, color, status: "painted" } : cell,
        ),
      );

      if (selectedCellRef.current?.id === cellId) {
        const nextSelectedCell: Cell = {
          ...selectedCellRef.current,
          color,
          status: "painted",
        };

        setSelectedCell(nextSelectedCell);
        selectedCellRef.current = nextSelectedCell;

        if (!isRoundExpiredRef.current) {
          closePopup();
        }
      }
    },
    [closePopup, updateCells],
  );

  const handleVoteUpdate = useCallback(
    ({ votes }: VoteUpdatePayload) => {
      applyVoteUpdate({ votes });
    },
    [applyVoteUpdate],
  );

  const handleTimerUpdate = useCallback(
    ({
      remainingSeconds,
      isRoundExpired,
      roundDurationSec,
      totalRounds,
      gameEndAt,
    }: TimerUpdatePayload) => {
      applyRoundTimer({ remainingSeconds, isRoundExpired });
      applyRoundMeta({ roundDurationSec, totalRounds, gameEndAt });
    },
    [applyRoundMeta, applyRoundTimer],
  );

  const handleGameEnded = useCallback(() => {
    setCanvasReady(false);
    markGameEnded();
    closePopup();
    clearSelectedCell();
    resetRoundState();
    resetRoundTimer();
    setRemaining(null);
    resetVotes();
    resetPreviewColor();
  }, [
    clearSelectedCell,
    closePopup,
    markGameEnded,
    resetPreviewColor,
    resetRoundState,
    resetRoundTimer,
    resetVotes,
    setRemaining,
  ]);

  useGameplaySocket({
    canvasId,
    onRoundStarted: handleRoundStarted,
    onRoundEnded: handleRoundEnded,
    onCanvasUpdated: handleCanvasUpdated,
    onVoteUpdate: handleVoteUpdate,
    onTimerUpdate: handleTimerUpdate,
    onGameEnded: handleGameEnded,
  });

  const handleVoteSuccess = useCallback(() => {
    void refreshVoteTickets(roundId);
  }, [refreshVoteTickets, roundId]);

  const handlePopupClose = useCallback(() => {
    clearSelectedCell();
    resetPreviewColor();
    closePopup();
  }, [clearSelectedCell, closePopup, resetPreviewColor]);

  const popupProps =
    popupOpen && selectedCell && canvasId
      ? {
          canvasId,
          roundId,
          isRoundExpired,
          selectedCell,
          votes,
          cells,
          position: popupPos,
          onVoteSuccess: handleVoteSuccess,
          onColorChange: handleColorChange,
          onClose: handlePopupClose,
        }
      : null;

  const panelProps = canvasId
    ? {
        roundNumber,
        totalRounds,
        formattedGameEndTime,
        formattedRemainingTime,
        remainingSeconds,
        roundDurationSec,
        votes,
        remaining,
        cells,
        gridX,
        gridY,
        selectedCell,
        viewport,
        onNavigateToCoordinate: navigateToCoordinate,
      }
    : null;

  return {
    loading,
    error,
    gameEnded,
    stageProps: {
      containerRef,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
    },
    surfaceProps: {
      canvasRef,
    },
    popupProps,
    panelProps,
  };
}
