import { useEffect, useMemo, useRef } from "react";
import { Cell } from "@/types/canvas";

const MINIMAP_BOX_SIZE = 220;
const EMPTY_CELL_COLOR = "#d1d5db";
const VIEWPORT_STROKE = "#ef4444";
const VIEWPORT_FILL = "rgba(239, 68, 68, 0.12)";
const SELECTED_CELL_STROKE = "#f97316";

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
  onNavigate: (x: number, y: number, behavior?: ScrollBehavior) => void;
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
  const isDraggingRef = useRef(false);

  const minimapDimensions = useMemo(() => {
    const longestSide = Math.max(gridX, gridY, 1);
    const scale = MINIMAP_BOX_SIZE / longestSide;

    return {
      width: Math.max(1, Math.round(gridX * scale)),
      height: Math.max(1, Math.round(gridY * scale)),
    };
  }, [gridX, gridY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = minimapDimensions.width;
    canvas.height = minimapDimensions.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cellWidth = canvas.width / Math.max(gridX, 1);
    const cellHeight = canvas.height / Math.max(gridY, 1);

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
      ctx.strokeStyle = SELECTED_CELL_STROKE;
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

  const navigateFromPointer = (
    clientX: number,
    clientY: number,
    behavior: ScrollBehavior = "auto",
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const relativeX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const relativeY = Math.min(Math.max(clientY - rect.top, 0), rect.height);

    const nextX = Math.min(
      gridX - 1,
      Math.max(0, Math.floor((relativeX / rect.width) * gridX)),
    );
    const nextY = Math.min(
      gridY - 1,
      Math.max(0, Math.floor((relativeY / rect.height) * gridY)),
    );

    onNavigate(nextX, nextY, behavior);
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;
      navigateFromPointer(event.clientX, event.clientY, "auto");
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [gridX, gridY, onNavigate]);

  return (
    <div className="flex justify-center">
      <div className="flex h-[220px] w-full items-center justify-center rounded-lg p-2">
        <canvas
          ref={canvasRef}
          onMouseDown={(event) => {
            isDraggingRef.current = true;
            navigateFromPointer(event.clientX, event.clientY, "auto");
          }}
          onDragStart={(event) => event.preventDefault()}
          className="block cursor-crosshair rounded border border-gray-50 bg-transparent"
          style={{
            width: `${minimapDimensions.width}px`,
            height: `${minimapDimensions.height}px`,
            imageRendering: "pixelated",
          }}
        />
      </div>
    </div>
  );
}
