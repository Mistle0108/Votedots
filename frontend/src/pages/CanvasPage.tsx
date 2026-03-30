import { useEffect, useRef, useState, useCallback } from "react";
import api from "@/shared/api/client";
import { CanvasCurrentResponse, Cell } from "@/types/canvas";
import VotePanel from "@/components/vote/VotePanel";
import VotePopup from "@/components/vote/VotePopup";
import useSocket from "@/hooks/useSocket";
import { voteApi } from "@/api/vote";

const CELL_SIZE = parseInt(import.meta.env.VITE_CELL_SIZE ?? "8");
const PANEL_WIDTH = 280;
const RESTART_TIME = 3;
const CHECKER_LIGHT = "#6f6f6f";
const CHECKER_DARK = "#5f5f5f";
const CANVAS_BACKGROUND_COLOR = "#2a2a2a";
const MINIMAP_SIZE = 220;

interface RoundStateResponse {
  status: "active" | "waiting";
  round: {
    id: number;
    roundNumber: number;
    startedAt: string;
    endedAt: string | null;
    roundDurationSec: number;
    totalRounds: number;
    gameEndAt: string;
  };
  timer: {
    remainingSeconds: number;
    isRoundExpired: boolean;
    roundDurationSec: number;
    totalRounds: number;
    gameEndAt: string;
  };
}

interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

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
  const animationRef = useRef<number>(0);
  const isPanning = useRef(false);
  const hasPanned = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

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

  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [roundDurationSec, setRoundDurationSec] = useState<number | null>(null);
  const [totalRounds, setTotalRounds] = useState<number>(0);
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
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

  const updateViewport = useCallback(() => {
    const container = containerRef.current;
    const canvasEl = canvasRef.current;

    if (!container || !canvasEl || gridX === 0 || gridY === 0) {
      setViewport(null);
      return;
    }

    const minimapScale = MINIMAP_SIZE / Math.max(gridX, gridY, 1);
    const minimapWidth = gridX * minimapScale;
    const minimapHeight = gridY * minimapScale;

    const visibleLeft = container.scrollLeft;
    const visibleTop = container.scrollTop;
    const visibleRight = visibleLeft + container.clientWidth;
    const visibleBottom = visibleTop + container.clientHeight;

    const canvasLeft = canvasEl.offsetLeft;
    const canvasTop = canvasEl.offsetTop;

    const canvasVisibleLeft = Math.max(0, visibleLeft - canvasLeft);
    const canvasVisibleTop = Math.max(0, visibleTop - canvasTop);
    const canvasVisibleRight = Math.min(
      canvasEl.width,
      visibleRight - canvasLeft,
    );
    const canvasVisibleBottom = Math.min(
      canvasEl.height,
      visibleBottom - canvasTop,
    );

    const visibleWidth = Math.max(0, canvasVisibleRight - canvasVisibleLeft);
    const visibleHeight = Math.max(0, canvasVisibleBottom - canvasVisibleTop);

    const nextWidth = Math.min(
      minimapWidth,
      (visibleWidth / canvasEl.width) * minimapWidth,
    );
    const nextHeight = Math.min(
      minimapHeight,
      (visibleHeight / canvasEl.height) * minimapHeight,
    );

    const nextLeft = Math.min(
      Math.max(0, (canvasVisibleLeft / canvasEl.width) * minimapWidth),
      Math.max(0, minimapWidth - nextWidth),
    );
    const nextTop = Math.min(
      Math.max(0, (canvasVisibleTop / canvasEl.height) * minimapHeight),
      Math.max(0, minimapHeight - nextHeight),
    );

    setViewport({
      left: nextLeft,
      top: nextTop,
      width: nextWidth,
      height: nextHeight,
    });
  }, [gridX, gridY]);

  const navigateToCoordinate = useCallback(
    (x: number, y: number, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      const canvasEl = canvasRef.current;

      if (!container || !canvasEl) return;

      const targetX = x * CELL_SIZE + CELL_SIZE / 2;
      const targetY = y * CELL_SIZE + CELL_SIZE / 2;

      const nextScrollLeft =
        canvasEl.offsetLeft + targetX - container.clientWidth / 2;
      const nextScrollTop =
        canvasEl.offsetTop + targetY - container.clientHeight / 2;

      const maxScrollLeft = Math.max(
        0,
        container.scrollWidth - container.clientWidth,
      );
      const maxScrollTop = Math.max(
        0,
        container.scrollHeight - container.clientHeight,
      );

      container.scrollTo({
        left: Math.min(Math.max(0, nextScrollLeft), maxScrollLeft),
        top: Math.min(Math.max(0, nextScrollTop), maxScrollTop),
        behavior,
      });

      requestAnimationFrame(() => {
        updateViewport();
      });
    },
    [updateViewport],
  );

  useEffect(() => {
    if (!canvasReady) return;

    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateViewport();
    };

    updateViewport();

    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [canvasReady, updateViewport]);

  useEffect(() => {
    if (!canvasReady) return;
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const render = (timestamp: number) => {
      const ctx = canvasEl.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      const currentCells = cellsRef.current;
      const currentSelectedCell = selectedCellRef.current;
      const currentPreviewColor = previewColorRef.current;
      const currentVotingCellIds = votingCellIdsRef.current;
      const currentTopColorMap = topColorMapRef.current;

      const alpha = (Math.sin((timestamp / 500) * Math.PI) + 1) / 2;
      const dashOffset = -(timestamp / 100) % 8;

      currentCells.forEach((cell) => {
        const x = cell.x * CELL_SIZE;
        const y = cell.y * CELL_SIZE;
        const isSelected = currentSelectedCell?.id === cell.id;
        const isVoting = currentVotingCellIds.has(cell.id);
        const topColor = currentTopColorMap.get(cell.id);

        if (cell.color) {
          ctx.fillStyle = cell.color;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        } else {
          const half = CELL_SIZE / 2;

          ctx.fillStyle = CHECKER_LIGHT;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

          ctx.fillStyle = CHECKER_DARK;
          ctx.fillRect(x, y, half, half);
          ctx.fillRect(x + half, y + half, half, half);
        }

        if (isSelected && currentPreviewColor) {
          ctx.fillStyle = currentPreviewColor;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        } else if (isVoting && topColor && !isSelected) {
          ctx.fillStyle = topColor;
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          ctx.globalAlpha = 1.0;
        }

        if (isSelected) {
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }

        if (isVoting && !isSelected) {
          ctx.save();
          ctx.strokeStyle = "#facc15";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = dashOffset;
          ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.setLineDash([]);
          ctx.restore();
        }
      });

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [canvasReady]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data } =
          await api.get<CanvasCurrentResponse>("/canvas/current");
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

        const roundRes = await api.get<RoundStateResponse>(
          `/canvas/${canvas.id}/rounds/active`,
        );
        const roundState = roundRes.data;

        if (roundState?.round) {
          setRoundId(roundState.round.id);
          setRoundNumber(roundState.round.roundNumber);
          setRoundDurationSec(roundState.round.roundDurationSec);
          setTotalRounds(roundState.round.totalRounds);
          setFormattedGameEndTime(
            formatClockTime(new Date(roundState.round.gameEndAt)),
          );
        }

        if (roundState?.timer) {
          setRemainingSeconds(roundState.timer.remainingSeconds);
          setFormattedRemainingTime(
            formatDuration(roundState.timer.remainingSeconds),
          );
          setIsRoundExpired(roundState.timer.isRoundExpired);
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
  }, [updateCells, updateViewport]);

  useEffect(() => {
    if (!gameEnded) return;
    const timer = setTimeout(async () => {
      try {
        await api.post("/canvas");
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
      setRoundId(roundId);
      setRoundNumber(roundNumber);
      setRoundDurationSec(roundDurationSec);
      setTotalRounds(totalRounds);
      setFormattedGameEndTime(formatClockTime(new Date(gameEndAt)));
      setVotes({});
      setRemainingSeconds(roundDurationSec);
      setFormattedRemainingTime(formatDuration(roundDurationSec));
      setIsRoundExpired(false);
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
    [],
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
    setGameEnded(true);
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
  }, []);

  useSocket({
    canvasId,
    onRoundStarted: handleRoundStarted,
    onRoundEnded: handleRoundEnded,
    onCanvasUpdated: handleCanvasUpdated,
    onVoteUpdate: handleVoteUpdate,
    onTimerUpdate: handleTimerUpdate,
    onGameEnded: handleGameEnded,
  });

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    isPanning.current = true;
    hasPanned.current = false;
    lastPos.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isPanning.current) return;
    const container = containerRef.current;
    if (!container) return;

    const dx = event.clientX - lastPos.current.x;
    const dy = event.clientY - lastPos.current.y;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      hasPanned.current = true;
    }

    container.scrollLeft -= dx;
    container.scrollTop -= dy;
    lastPos.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    isPanning.current = false;

    if (!hasPanned.current) {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      const rect = canvasEl.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left) / CELL_SIZE);
      const y = Math.floor((event.clientY - rect.top) / CELL_SIZE);

      const cell = cells.find(
        (candidate) => candidate.x === x && candidate.y === y,
      );
      if (cell && cell.status !== "locked") {
        setSelectedCell(cell);
        selectedCellRef.current = cell;
        setPreviewColor(null);
        previewColorRef.current = null;
        setPopupPos({
          x: rect.left + (cell.x + 2) * CELL_SIZE,
          y: rect.top + (cell.y - 1.5) * CELL_SIZE,
        });
        setPopupOpen(true);
      }
    }
  };

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
      <div
        className="relative overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          width: `calc(100% - ${PANEL_WIDTH}px)`,
          backgroundColor: CANVAS_BACKGROUND_COLOR,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isPanning.current = false;
        }}
      >
        <div
          ref={containerRef}
          className="h-full w-full overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="min-h-full min-w-full">
            <canvas ref={canvasRef} className="border border-gray-300" />
          </div>
        </div>
      </div>

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
