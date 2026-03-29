import { useEffect, useMemo, useRef } from "react";
import { Cell } from "@/types/canvas";

const MINIMAP_SIZE = 220;
const EMPTY_CELL_COLOR = "#d1d5db";
const VIEWPORT_STROKE = "#ef4444";
const VIEWPORT_FILL = "rgba(239, 68, 68, 0.12)";

interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  cells: Cell[];
  gridX: number;
  gridY: number;
  viewport: Viewport | null;
  selectedCell: Cell | null;
  onNavigate: (x: number, y: number) => void;
}

export default function MiniMap({
  cells,
  gridX,
  gridY,
  viewport,
  selectedCell,
  onNavigate,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const minimapDimensions = useMemo(() => {
    const longestSide = Math.max(gridX, gridY, 1);
    const scale = MINIMAP_SIZE / longestSide;

    return {
      width: Math.max(1, Math.round(gridX * scale)),
      height: Math.max(1, Math.round(gridY * scale)),
      scale,
    };
  }, [gridX, gridY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = minimapDimensions.width;
    canvas.height = minimapDimensions.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cellWidth = canvas.width / gridX;
    const cellHeight = canvas.height / gridY;

    for (const cell of cells) {
      ctx.fillStyle = cell.color ?? EMPTY_CELL_COLOR;
      ctx.fillRect(
        cell.x * cellWidth,
        cell.y * cellHeight,
        Math.ceil(cellWidth),
        Math.ceil(cellHeight),
      );
    }

    if (selectedCell) {
      ctx.save();
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        selectedCell.x * cellWidth,
        selectedCell.y * cellHeight,
        Math.max(cellWidth, 1),
        Math.max(cellHeight, 1),
      );
      ctx.restore();
    }

    if (viewport) {
      ctx.save();
      ctx.fillStyle = VIEWPORT_FILL;
      ctx.strokeStyle = VIEWPORT_STROKE;
      ctx.lineWidth = 2;
      ctx.fillRect(
        viewport.left,
        viewport.top,
        viewport.width,
        viewport.height,
      );
      ctx.strokeRect(
        viewport.left,
        viewport.top,
        viewport.width,
        viewport.height,
      );
      ctx.restore();
    }
  }, [cells, gridX, gridY, minimapDimensions, selectedCell, viewport]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const normalizedX = Math.min(
      gridX - 1,
      Math.max(0, Math.floor((clickX / rect.width) * gridX)),
    );
    const normalizedY = Math.min(
      gridY - 1,
      Math.max(0, Math.floor((clickY / rect.height) * gridY)),
    );

    onNavigate(normalizedX, normalizedY);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">미니맵</p>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="block w-full cursor-pointer rounded border border-gray-200 bg-white"
          style={{
            imageRendering: "pixelated",
            aspectRatio: `${gridX} / ${gridY}`,
          }}
        />
      </div>

      <p className="text-xs text-gray-400">
        미니맵을 클릭하면 해당 좌표가 메인 캔버스 화면 중앙으로 이동합니다.
      </p>
    </div>
  );
}
