import { useCallback, useEffect, useRef, useState } from "react";
import VotePanel from "@/components/vote/VotePanel";
import VotePopup from "@/components/vote/VotePopup";
import { voteApi } from "@/api/vote";
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
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [votingCellIds, setVotingCellIds] = useState<Set<number>>(new Set());
  const [topColorMap, setTopColorMap] = useState<Map<number, string>>(
    new Map(),
  );
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [remaining, setRemaining] = useState<number | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

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
      setRemaining(result.remaining);
    },
    [updateCells],
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

  const handleResetPreviewColor = useCallback(() => {
    setPreviewColor(null);
    previewColorRef.current = null;
  }, []);

  const handleOpenPopup = useCallback((position: { x: number; y: number }) => {
    setPopupPos(position);
    setPopupOpen(true);
  }, []);

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } =
    useCanvasInteraction({
      containerRef,
      canvasRef,
      cells,
      onSelectCell: handleSelectCell,
      onResetPreviewColor: handleResetPreviewColor,
      onOpenPopup: handleOpenPopup,
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
      setVotes({});
      setRemainingSeconds(roundDurationSec);
      setFormattedRemainingTime(formatDuration(roundDurationSec));
      setIsRoundExpired(false);
      clearSessionError();
      votingCellIdsRef.current = new Set();
      topColorMapRef.current = new Map();
      setVotingCellIds(new Set());
      setTopColorMap(new Map());

      voteApi
        .getTickets(roundId)
        .then(({ data }) => setRemaining(data.remaining))
        .catch(() => setRemaining(null));
    },
    [clearSessionError],
  );

  const handleRoundEnded = useCallback(() => {
    setVotes({});
    setRemaining(null);
    setRemainingSeconds(0);
    setFormattedRemainingTime(formatDuration(0));
    setIsRoundExpired(true);
    votingCellIdsRef.current = new Set();
    topColorMapRef.current = new Map();
    setVotingCellIds(new Set());
    setTopColorMap(new Map());
  }, []);

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
          setPopupOpen(false);
        }
      }
    },
    [updateCells],
  );

  const handleVoteUpdate = useCallback(
    ({ votes }: { votes: Record<string, number> }) => {
      setVotes(votes);

      const newVotingCellIds = new Set<number>();
      const countMap = new Map<number, { color: string; count: number }>();

      for (const [key, count] of Object.entries(votes)) {
        const [cellIdStr, color] = key.split(":");
        const cellId = parseInt(cellIdStr, 10);
        newVotingCellIds.add(cellId);

        const existing = countMap.get(cellId);
        if (!existing || count > existing.count) {
          countMap.set(cellId, { color, count });
        }
      }

      const newTopColorMap = new Map<number, string>();
      countMap.forEach(({ color }, cellId) => {
        newTopColorMap.set(cellId, color);
      });

      votingCellIdsRef.current = newVotingCellIds;
      topColorMapRef.current = newTopColorMap;
      setVotingCellIds(newVotingCellIds);
      setTopColorMap(newTopColorMap);
    },
    [],
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
    setPopupOpen(false);
    setRoundId(null);
    setRoundNumber(null);
    setRoundDurationSec(null);
    setVotes({});
    setRemaining(null);
    setRemainingSeconds(null);
    setFormattedRemainingTime(null);
    setFormattedGameEndTime(null);
    setIsRoundExpired(false);
    votingCellIdsRef.current = new Set();
    topColorMapRef.current = new Map();
    setVotingCellIds(new Set());
    setTopColorMap(new Map());
  }, [markGameEnded]);

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
    if (roundId) {
      voteApi
        .getTickets(roundId)
        .then(({ data }) => setRemaining(data.remaining))
        .catch(() => setRemaining(null));
    }
  };

  const handlePopupClose = () => {
    setSelectedCell(null);
    selectedCellRef.current = null;
    setPreviewColor(null);
    previewColorRef.current = null;
    setPopupOpen(false);
  };

  const handleColorChange = (color: string | null) => {
    setPreviewColor(color);
    previewColorRef.current = color;
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
