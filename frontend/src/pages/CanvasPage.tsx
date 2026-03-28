import { useEffect, useRef, useState, useCallback } from "react";
import api from "@/lib/api";
import { CanvasCurrentResponse, Cell } from "@/types/canvas";
import VotePanel from "@/components/vote/VotePanel";
import VotePopup from "@/components/vote/VotePopup";
import useSocket from "@/hooks/useSocket";
import { voteApi } from "@/api/vote";

/**
 * 상수 정의
 */
const CELL_SIZE = parseInt(import.meta.env.VITE_CELL_SIZE ?? "8"); // 셀 하나의 크기
const PANEL_WIDTH = 280; // 우측 투표 패널 너비
const RESTART_TIME = 3;  // 게임 종료 후 새로 고침 타이머
const CHECKER_LIGHT = "#6f6f6f";
const CHECKER_DARK = "#5f5f5f";
const CANVAS_BACKGROUND_COLOR = "#2a2a2a";

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

  const [cells, setCells] = useState<Cell[]>([]);
  const [canvasId, setCanvasId] = useState<number | null>(null);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [roundDurationSec, setRoundDurationSec] = useState<number | null>(null);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [formattedGameEndTime, setFormattedGameEndTime] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [formattedRemainingTime, setFormattedRemainingTime] = useState<string | null>(null);
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
  const [usedColors, setUsedColors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

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

  useEffect(() => {
    if (!canvasReady) return;
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const render = (timestamp: number) => {
      const ctx = canvasEl.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      const cells = cellsRef.current;
      const selectedCell = selectedCellRef.current;
      const previewColor = previewColorRef.current;
      const votingCellIds = votingCellIdsRef.current;
      const topColorMap = topColorMapRef.current;

      const alpha = (Math.sin((timestamp / 500) * Math.PI) + 1) / 2;
      const dashOffset = -(timestamp / 100) % 8;

      cells.forEach((cell) => {
        const x = cell.x * CELL_SIZE;
        const y = cell.y * CELL_SIZE;
        const isSelected = selectedCell?.id === cell.id;
        const isVoting = votingCellIds.has(cell.id);
        const topColor = topColorMap.get(cell.id);

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

        // 선택 중인 셀은 점등 없이 previewColor로만 표시
        if (isSelected && previewColor) {
          ctx.fillStyle = previewColor;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        } else if (isVoting && topColor && !isSelected) {
          // 선택 중이 아닌 투표 중 셀만 점등
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
    api
      .get<CanvasCurrentResponse>("/canvas/current")
      .then(({ data }) => {
        const { canvas, cells, roundDurationSec, totalRounds } = data;
        setCanvasId(canvas.id);
        updateCells(cells);
        setRoundDurationSec(roundDurationSec);
        setTotalRounds(totalRounds);

        const canvasEl = canvasRef.current;
        if (!canvasEl) return;
        canvasEl.width = canvas.gridX * CELL_SIZE;
        canvasEl.height = canvas.gridY * CELL_SIZE;
        setCanvasReady(true);

        return api.get(`/canvas/${canvas.id}/rounds/active`);
      })
      .then((res) => {
        if (res?.data?.round) {
          setRoundId(res.data.round.id);
          setRoundNumber(res.data.round.roundNumber);
          setStartedAt(res.data.round.startedAt);
          return voteApi.getTickets(res.data.round.id);
        }
      })
      .then((res) => {
        if (res?.data) setRemaining(res.data.remaining);
      })
      .catch(() => setError("진행 중인 캔버스가 없어요."))
      .finally(() => setLoading(false));
  }, []);


  /**
   * 게임 종료시 새 게임 실행
   */
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

  /**
   * 소켓 이벤트 핸들러
   */

  // 라운드 시작
  const handleRoundStarted = useCallback(
    ({
      roundId,
      roundNumber,
      startedAt,
      roundDurationSec,
      totalRounds,
      gameEndAt,
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
      setStartedAt(startedAt);
      setRoundDurationSec(roundDurationSec);
      setTotalRounds(totalRounds);
      setFormattedGameEndTime(formatClockTime(new Date(gameEndAt)));
      setVotes({});
      setRemainingSeconds(roundDurationSec);
      setFormattedRemainingTime(formatDuration(roundDurationSec));
      setIsRoundExpired(false);
      votingCellIdsRef.current = new Set();
      topColorMapRef.current = new Map();
      setVotingCellIds(new Set());
      setTopColorMap(new Map());
      voteApi
        .getTickets(roundId)
        .then(({ data }) => setRemaining(data.remaining));
    }, [],);

  const handleRoundEnded = useCallback(() => {
    setSelectedCell(null);
    selectedCellRef.current = null;
    setPreviewColor(null);
    previewColorRef.current = null;
    setPopupOpen(false);
    setRoundId(null);
    setRoundNumber(null);
    setStartedAt(null);
    setVotes({});
    setRemaining(null);
    votingCellIdsRef.current = new Set();
    topColorMapRef.current = new Map();
    setVotingCellIds(new Set());
    setTopColorMap(new Map());
  }, []);

  const handleCanvasUpdated = useCallback(
    ({ cellId, color }: { cellId: number; color: string }) => {
      updateCells((prev) =>
        prev.map((c) =>
          c.id === cellId ? { ...c, color, status: "painted" } : c,
        ),
      );
      if (selectedCellRef.current?.id === cellId) {
        setSelectedCell(null);
        selectedCellRef.current = null;
        setPopupOpen(false);
      }
    },
    [],
  );

  const handleVoteUpdate = useCallback(
    ({ votes }: { votes: Record<string, number> }) => {
      setVotes(votes);

      const newVotingCellIds = new Set<number>();
      const countMap = new Map<number, { color: string; count: number }>();

      for (const [key, count] of Object.entries(votes)) {
        const [cellIdStr, color] = key.split(":");
        const cellId = parseInt(cellIdStr);
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
    setStartedAt(null);
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


  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    hasPanned.current = false;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const container = containerRef.current;
    if (!container) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasPanned.current = true;
    container.scrollLeft -= dx;
    container.scrollTop -= dy;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  /** 투표 모달 팝업 동작*/
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = false;

    if (!hasPanned.current) {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      const rect = canvasEl.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
      const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

      const cell = cells.find((c) => c.x === x && c.y === y);
      if (cell && cell.status !== "locked") {
        setSelectedCell(cell);
        selectedCellRef.current = cell;
        setPreviewColor(null);
        previewColorRef.current = null;
        const rect = canvasEl.getBoundingClientRect();
        setPopupPos({
          x: rect.left + (cell.x + 2) * CELL_SIZE,
          y: rect.top + (cell.y - 1.5) * CELL_SIZE,
        });
        setPopupOpen(true);
      }
    }
  };

  const handleVoteSuccess = (color: string) => {
    // 사용한 색상 추가 — 중복 제거 후 앞에 추가, 최대 12개
    setUsedColors((prev) => {
      const filtered = prev.filter((c) => c !== color);
      return [color, ...filtered].slice(0, 12);
    });
    setSelectedCell(null);
    selectedCellRef.current = null;
    setPreviewColor(null);
    previewColorRef.current = null;
    setPopupOpen(false);
    if (roundId) {
      voteApi
        .getTickets(roundId)
        .then(({ data }) => setRemaining(data.remaining));
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

  //TODO:LOG
  useEffect(() => {
    console.log({
      remainingSeconds,
      formattedRemainingTime,
      isRoundExpired,
      formattedGameEndTime,
      roundDurationSec,
      totalRounds,
    });
  }, [
    remainingSeconds,
    formattedRemainingTime,
    isRoundExpired,
    formattedGameEndTime,
    roundDurationSec,
    totalRounds,
  ]);


  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        로딩 중...
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-screen">{error}</div>
    );
  if (gameEnded)
    return (
      <div className="flex items-center justify-center h-screen text-xl font-bold">
        게임이 종료됐어요 🎨 새 게임을 생성할게요.
      </div>
    );

  return (
    <div className="flex w-full h-screen">
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
        <div ref={containerRef} className="overflow-auto w-full h-full">
          <div className="flex items-center justify-center min-w-full min-h-full p-8">
            <canvas ref={canvasRef} className="border border-gray-300" />
          </div>
        </div>
      </div>

      {/* 투표 팝업 */}
      {popupOpen && selectedCell && canvasId && (
        <VotePopup
          canvasId={canvasId}
          roundId={roundId}
          selectedCell={selectedCell}
          votes={votes}
          cells={cells}
          position={popupPos}
          onVoteSuccess={handleVoteSuccess}
          onColorChange={handleColorChange}
          onClose={handlePopupClose}
        />
      )}

      {/* 우측 패널 */}
      <div
        className="border-l border-gray-200 bg-white shrink-0"
        style={{ width: `${PANEL_WIDTH}px` }}
      >
        {canvasId && (
          <VotePanel
            roundId={roundId}
            roundNumber={roundNumber}
            roundDurationSec={roundDurationSec}
            startedAt={startedAt}
            votes={votes}
            remaining={remaining}
            cells={cells}
          />
        )}
      </div>
    </div>
  );
}
