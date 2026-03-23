import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { CanvasCurrentResponse, Cell } from "@/types/canvas";

const CELL_SIZE = parseInt(import.meta.env.VITE_CELL_SIZE ?? "8");
const PANEL_WIDTH = 280;

function drawGrid(ctx: CanvasRenderingContext2D, cells: Cell[]) {
  cells.forEach((cell) => {
    ctx.fillStyle = cell.color ?? "#e5e7eb";
    ctx.fillRect(
      cell.x * CELL_SIZE,
      cell.y * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE
    );
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(
      cell.x * CELL_SIZE,
      cell.y * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE
    );
  });
}

export default function CanvasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<CanvasCurrentResponse>("/canvas/current")
      .then(({ data }) => {
        const { canvas, cells } = data;
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;

        canvasEl.width = canvas.gridX * CELL_SIZE;
        canvasEl.height = canvas.gridY * CELL_SIZE;

        const ctx = canvasEl.getContext("2d");
        if (!ctx) return;

        drawGrid(ctx, cells);
      })
      .catch(() => setError("진행 중인 캔버스가 없어요."))
      .finally(() => setLoading(false));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // 좌클릭만
    isPanning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const container = containerRef.current;
    if (!container) return;

    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    container.scrollLeft -= dx;
    container.scrollTop -= dy;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // 좌클릭
    isPanning.current = false;
  };

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="flex w-full h-screen">
      {/* 캔버스 영역 */}
      <div
        ref={containerRef}
        className="overflow-auto bg-gray-50 cursor-grab"
        style={{ width: `calc(100% - ${PANEL_WIDTH}px)` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isPanning.current = false; }}
      >
        <div className="flex items-center justify-center min-w-full min-h-full p-8">
          <canvas ref={canvasRef} className="border border-gray-300" />
        </div>
      </div>

      {/* 패널 영역 - TODO: 패널 구현 */}
      <div
        className="border-l border-gray-200 bg-white shrink-0"
        style={{ width: `${PANEL_WIDTH}px` }}
      >
      </div>
    </div>
  );
}