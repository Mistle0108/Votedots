import { useCallback, useEffect, useRef, useState } from "react";
import {
  CanvasStage,
  CanvasSurface,
  Cell,
  CELL_SIZE,
  PANEL_WIDTH,
  useCanvasInteraction,
  useCanvasNavigation,
  useCanvasRenderer,
  useCanvasViewport,
} from "@/features/gameplay/canvas";
import {
  ErrorScreen,
  GameEndedScreen,
  LoadingScreen,
  SessionBootstrapResult,
  useGameSession,
  useGameplaySocket,
} from "@/features/gameplay/session";
import {
  VotePanel,
  VotePopup,
  useVotePopupState,
  useVoteState,
} from "@/features/gameplay/vote";

function formatClockTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export default function CanvasPage() {
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

  const [roundId, setRoundId] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [roundDurationSec, setRoundDurationSec] = useState<number | null>(null);
  const [totalRounds, setTotalRounds] = useState(0);
  const [formattedGameEndTime, setFormattedGameEndTime] = useState<
    string | null
  >(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [formattedRemainingTime, setFormattedRemainingTime] = useState<
    string | null
  >(null);
  const [isRoundExpired, setIsRoundExpired] = useState(false);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const {
    votes,
    remaining,
    previewColor,
    votingCellIds,
    topColorMap,
    setRemaining,
    handleVoteUpdate: applyVoteUpdate,
    handleRoundStarted: handleVoteRoundStarted,
    handleRoundEnded: handleVoteRoundEnded,
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

  const applyBootstrap = useCallback(
    (result: SessionBootstrapResult) => {
      setCanvasId(result.canvasId);
      setGridX(result.gridX);
      setGridY(result.gridY);
      updateCells(result.cells);

      setRoundId(result.round.roundId);
      setRoundNumber(result.round.roundNumber);
      setRoundDurationSec(result.round.roundDurationSec);
      setTotalRounds(result.round.totalRounds);
      setFormattedGameEndTime(result.round.formattedGameEndTime);
      setRemainingSeconds(result.round.remainingSeconds);
      setFormattedRemainingTime(result.round.formattedRemainingTime);
      setIsRoundExpired(result.round.isRoundExpired);

      resetVotes();
      resetPreviewColor();
      setRemaining(result.remaining);
      setSelectedCell(null);
      closePopup();
    },
    [closePopup, resetPreviewColor, resetVotes, setRemaining, updateCells],
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasId || gridX === 0 || gridY === 0) return;

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
      setRoundId(roundId);
      setRoundNumber(roundNumber);
      setRoundDurationSec(roundDurationSec);
      setTotalRounds(totalRounds);
      setFormattedGameEndTime(formatClockTime(new Date(gameEndAt)));
      setRemainingSeconds(roundDurationSec);
      setFormattedRemainingTime(formatDuration(roundDurationSec));
      setIsRoundExpired(false);
      clearSessionError();
      void handleVoteRoundStarted(roundId);
    },
    [clearSessionError, handleVoteRoundStarted],
  );

  const handleRoundEnded = useCallback(() => {
    setRemainingSeconds(0);
    setFormattedRemainingTime(formatDuration(0));
    setIsRoundExpired(true);
    handleVoteRoundEnded();
  }, [handleVoteRoundEnded]);

  const handleCanvasUpdated = useCallback(
    ({ cellId, color }: { cellId: number; color: string }) => {
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
    ({ votes }: { votes: Record<string, number> }) => {
      applyVoteUpdate({ votes });
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
      setRemainingSeconds(remainingSeconds);
      setFormattedRemainingTime(formatDuration(remainingSeconds));
      setIsRoundExpired(isRoundExpired);
      setFormattedGameEndTime(formatClockTime(new Date(gameEndAt)));
      setRoundDurationSec(roundDurationSec);
      setTotalRounds(totalRounds);
    },
    [],
  );

  const handleGameEnded = useCallback(() => {
    markGameEnded();
    closePopup();
    setSelectedCell(null);
    selectedCellRef.current = null;
    setRoundId(null);
    setRoundNumber(null);
    setRoundDurationSec(null);
    setRemaining(null);
    setRemainingSeconds(null);
    setFormattedRemainingTime(null);
    setFormattedGameEndTime(null);
    setIsRoundExpired(false);
    resetVotes();
    resetPreviewColor();
  }, [closePopup, markGameEnded, resetPreviewColor, resetVotes, setRemaining]);

  useGameplaySocket({
    canvasId,
    onRoundStarted: handleRoundStarted,
    onRoundEnded: handleRoundEnded,
    onCanvasUpdated: handleCanvasUpdated,
    onVoteUpdate: handleVoteUpdate,
    onTimerUpdate: handleTimerUpdate,
    onGameEnded: handleGameEnded,
  });

  const handleVoteSuccess = () => {
    void refreshVoteTickets(roundId);
  };

  const handlePopupClose = () => {
    setSelectedCell(null);
    selectedCellRef.current = null;
    resetPreviewColor();
    closePopup();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (gameEnded) {
    return <GameEndedScreen />;
  }

  return (
    <div className="flex h-screen w-full">
      <CanvasStage
        containerRef={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <CanvasSurface canvasRef={canvasRef} />
      </CanvasStage>

      {popupOpen && selectedCell && canvasId && (
        <VotePopup
          canvasId={canvasId}
          roundId={roundId}
          isRoundExpired={isRoundExpired}
          selectedCell={selectedCell}
          votes={votes}
          cells={cells}
          position={popupPos}
          onVoteSuccess={handleVoteSuccess}
          onColorChange={handleColorChange}
          onClose={handlePopupClose}
        />
      )}

      <div
        className="shrink-0 border-l border-gray-200 bg-white"
        style={{ width: `${PANEL_WIDTH}px` }}
      >
        {canvasId && (
          <VotePanel
            roundNumber={roundNumber}
            totalRounds={totalRounds}
            formattedGameEndTime={formattedGameEndTime}
            formattedRemainingTime={formattedRemainingTime}
            remainingSeconds={remainingSeconds}
            roundDurationSec={roundDurationSec}
            votes={votes}
            remaining={remaining}
            cells={cells}
            gridX={gridX}
            gridY={gridY}
            selectedCell={selectedCell}
            viewport={viewport}
            onNavigateToCoordinate={navigateToCoordinate}
          />
        )}
      </div>
    </div>
  );
}
