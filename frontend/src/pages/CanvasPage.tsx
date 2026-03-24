import { useEffect, useRef, useState, useCallback } from "react";
import api from "@/lib/api";
import { CanvasCurrentResponse, Cell } from "@/types/canvas";
import VotePanel from "@/components/vote/VotePanel";
import useSocket from "@/hooks/useSocket";

const CELL_SIZE = parseInt(import.meta.env.VITE_CELL_SIZE ?? "8");
const PANEL_WIDTH = 280;

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
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [votingCellIds, setVotingCellIds] = useState<Set<number>>(new Set());
  const [topColorMap, setTopColorMap] = useState<Map<number, string>>(
    new Map(),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  // ref 동기화
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

  // cells는 ref와 state 동시 업데이트하는 헬퍼 사용
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

  // 애니메이션 루프
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

        // 기본 배경색
        ctx.fillStyle = cell.color ?? "#e5e7eb";
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // 색상 미리보기
        if (isSelected && previewColor) {
          ctx.fillStyle = previewColor;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }

        // 투표 중 sin 점멸
        if (isVoting && topColor) {
          ctx.fillStyle = topColor;
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          ctx.globalAlpha = 1.0;
        }

        // 그리드 선
        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

        // 선택된 셀 빨간 테두리 (안쪽 1px)
        if (isSelected) {
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }

        // 투표 중인 셀 점선 회전 테두리
        if (isVoting) {
          ctx.save();
          ctx.strokeStyle = "#6366f1";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.lineDashOffset = dashOffset;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
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
        const { canvas, cells } = data;
        setCanvasId(canvas.id);
        updateCells(cells);

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
        }
      })
      .catch(() => setError("진행 중인 캔버스가 없어요."))
      .finally(() => setLoading(false));
  }, []);

  const handleRoundStarted = useCallback(
    ({
      roundId,
      roundNumber,
      startedAt,
    }: {
      roundId: number;
      roundNumber: number;
      startedAt: string;
    }) => {
      setRoundId(roundId);
      setRoundNumber(roundNumber);
      setStartedAt(startedAt);
      votingCellIdsRef.current = new Set();
      topColorMapRef.current = new Map();
      setVotingCellIds(new Set());
      setTopColorMap(new Map());
    },
    [],
  );

  const handleRoundEnded = useCallback(() => {
    setSelectedCell(null);
    selectedCellRef.current = null;
    setPreviewColor(null);
    previewColorRef.current = null;
    setRoundId(null);
    setRoundNumber(null);
    setStartedAt(null);
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
      }
    },
    [],
  );

  const handleVoteUpdate = useCallback(
    ({ votes }: { votes: Record<string, number> }) => {
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

  const handleGameEnded = useCallback(() => {
    setGameEnded(true);
    setRoundId(null);
    setRoundNumber(null);
    setStartedAt(null);
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
      }
    }
  };

  const handleVoteSuccess = () => {
    setSelectedCell(null);
    selectedCellRef.current = null;
    setPreviewColor(null);
    previewColorRef.current = null;
  };

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
        게임이 종료됐어요 🎨
      </div>
    );

  return (
    <div className="flex w-full h-screen">
      <div
        ref={containerRef}
        className="overflow-auto bg-gray-50 cursor-grab active:cursor-grabbing"
        style={{ width: `calc(100% - ${PANEL_WIDTH}px)` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isPanning.current = false;
        }}
      >
        <div className="flex items-center justify-center min-w-full min-h-full p-8">
          <canvas ref={canvasRef} className="border border-gray-300" />
        </div>
      </div>

      <div
        className="border-l border-gray-200 bg-white shrink-0"
        style={{ width: `${PANEL_WIDTH}px` }}
      >
        {canvasId && (
          <VotePanel
            canvasId={canvasId}
            roundId={roundId}
            roundNumber={roundNumber}
            startedAt={startedAt}
            selectedCell={selectedCell}
            onVoteSuccess={handleVoteSuccess}
            onColorChange={(color) => {
              setPreviewColor(color);
              previewColorRef.current = color;
            }}
          />
        )}
      </div>
    </div>
  );
}
