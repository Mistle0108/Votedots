import { useCallback, useEffect, useRef, useState } from "react";
import VotePanel from "@/components/vote/VotePanel";
import VotePopup from "@/components/vote/VotePopup";
import { voteApi } from "@/api/vote";
import useSocket from "@/hooks/useSocket";
import {
  CanvasStage,
  CanvasSurface,
  Cell,
  CELL_SIZE,
  PANEL_WIDTH,
  RESTART_TIME,
  canvasApi,
  useCanvasInteraction,
  useCanvasNavigation,
  useCanvasRenderer,
  useCanvasViewport,
} from "@/features/gameplay/canvas";
import {
  type RoundStateResponse,
  useRoundState,
  useRoundTimer,
} from "@/features/gameplay/round";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
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

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data } = await canvasApi.getCurrent();
        const { canvas, cells } = data;

        setCanvasId(canvas.id);
        setGridX(canvas.gridX);
        setGridY(canvas.gridY);
        updateCells(cells);

        const canvasEl = canvasRef.current;
        if (!canvasEl) return;

        canvasEl.width = canvas.gridX * CELL_SIZE;
        canvasEl.height = canvas.gridY * CELL_SIZE;
        setCanvasReady(true);

        const roundRes = await canvasApi.getActiveRound(canvas.id);
        const roundState: RoundStateResponse = roundRes.data;

        if (roundState?.round) {
          applyRoundState(roundState.round);
        }

        if (roundState?.timer) {
          applyRoundTimer(roundState.timer);
        }

        if (roundState?.status === "active" && roundState.round.id) {
          const ticketsRes = await voteApi.getTickets(roundState.round.id);
          setRemaining(ticketsRes.data.remaining);
        } else {
          setRemaining(null);
        }

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            updateViewport();
          });
        });
      } catch {
        setError("진행중인 캔버스가 없어요");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [applyRoundState, applyRoundTimer, updateCells, updateViewport]);

  useEffect(() => {
    if (!gameEnded) return;

    const timer = setTimeout(async () => {
      try {
        await canvasApi.createCanvas();
      } catch (err) {
        console.error("캔버스 생성 실패:", err);
      }
      window.location.reload();
    }, RESTART_TIME * 1000);

    return () => clearTimeout(timer);
  }, [gameEnded]);

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
      applyRoundState({
        id: roundId,
        roundNumber,
        startedAt: "",
        endedAt: null,
        roundDurationSec,
        totalRounds,
        gameEndAt,
      });
      setVotes({});
      startRoundTimer(roundDurationSec);
      setError(null);
      votingCellIdsRef.current = new Set();
      topColorMapRef.current = new Map();
      setVotingCellIds(new Set());
      setTopColorMap(new Map());

      voteApi
        .getTickets(roundId)
        .then(({ data }) => setRemaining(data.remaining))
        .catch(() => setRemaining(null));
    },
    [applyRoundState, startRoundTimer],
  );

  const handleRoundEnded = useCallback(() => {
    setVotes({});
    setRemaining(null);
    expireRoundTimer();
    votingCellIdsRef.current = new Set();
    topColorMapRef.current = new Map();
    setVotingCellIds(new Set());
    setTopColorMap(new Map());
  }, [expireRoundTimer]);

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
      applyRoundTimer({
        remainingSeconds,
        isRoundExpired,
      });
      applyRoundMeta({
        gameEndAt,
        roundDurationSec,
        totalRounds,
      });
    },
    [applyRoundMeta, applyRoundTimer],
  );

  const handleGameEnded = useCallback(() => {
    setGameEnded(true);
    setPopupOpen(false);
    resetRoundState();
    resetRoundTimer();
    setRemaining(null);
    votingCellIdsRef.current = new Set();
    topColorMapRef.current = new Map();
    setVotingCellIds(new Set());
    setTopColorMap(new Map());
  }, [resetRoundState, resetRoundTimer]);

  useSocket({
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
    return (
      <div className="flex h-screen items-center justify-center">
        로딩 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">{error}</div>
    );
  }

  if (gameEnded) {
    return (
      <div className="flex h-screen items-center justify-center text-xl font-bold">
        게임이 종료되었어요. 곧 새 게임이 생성됩니다.
      </div>
    );
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
