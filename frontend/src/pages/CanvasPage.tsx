import { useEffect, useRef, useState, useCallback } from "react";
import api from "@/lib/api";
import { CanvasCurrentResponse, Cell } from "@/types/canvas";
import VotePanel from "@/components/vote/VotePanel";
import useSocket from "@/hooks/useSocket";

const CELL_SIZE = parseInt(import.meta.env.VITE_CELL_SIZE ?? "8");
const PANEL_WIDTH = 280;

function drawGrid(
  ctx: CanvasRenderingContext2D,
  cells: Cell[],
  selectedCell: Cell | null,
) {
  cells.forEach((cell) => {
    ctx.fillStyle = cell.color ?? "#e5e7eb";
    ctx.fillRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(
      cell.x * CELL_SIZE,
      cell.y * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE,
    );
  });

  if (selectedCell) {
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      selectedCell.x * CELL_SIZE,
      selectedCell.y * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE,
    );
  }
}

export default function CanvasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const hasPanned = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const [cells, setCells] = useState<Cell[]>([]);
  const [canvasId, setCanvasId] = useState<number | null>(null);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);

  useEffect(() => {
    api
      .get<CanvasCurrentResponse>("/canvas/current")
      .then(({ data }) => {
        const { canvas, cells } = data;
        setCanvasId(canvas.id);
        setCells(cells);

        const canvasEl = canvasRef.current;
        if (!canvasEl) return;
        canvasEl.width = canvas.gridX * CELL_SIZE;
        canvasEl.height = canvas.gridY * CELL_SIZE;

        const ctx = canvasEl.getContext("2d");
        if (!ctx) return;
        drawGrid(ctx, cells, null);

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

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    drawGrid(ctx, cells, selectedCell);
  }, [cells, selectedCell]);

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
    },
    [],
  );

  const handleRoundEnded = useCallback(() => {
    setSelectedCell(null);
    setRoundId(null);
    setRoundNumber(null);
    setStartedAt(null);
  }, []);

  const handleCanvasUpdated = useCallback(
    ({ cellId, color }: { cellId: number; color: string }) => {
      setCells((prev) =>
        prev.map((c) =>
          c.id === cellId ? { ...c, color, status: "painted" } : c,
        ),
      );
      setSelectedCell((prev) => (prev?.id === cellId ? null : prev));
    },
    [],
  );

  const handleVoteUpdate = useCallback(() => {}, []);

  const handleGameEnded = useCallback(() => {
    setGameEnded(true);
    setRoundId(null);
    setRoundNumber(null);
    setStartedAt(null);
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
      const container = containerRef.current;
      if (!canvasEl || !container) return;

      const rect = canvasEl.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
      const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

      const cell = cells.find((c) => c.x === x && c.y === y);
      if (cell && cell.status !== "painted" && cell.status !== "locked") {
        setSelectedCell(cell);
      }
    }
  };

  const handleVoteSuccess = () => {
    setSelectedCell(null);
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
          />
        )}
      </div>
    </div>
  );
}
