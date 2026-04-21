import { useEffect, useMemo, useRef } from "react";
import { Cell, Viewport } from "../model/canvas.types";

const MINIMAP_BOX_SIZE = 220;
const VIEWPORT_STROKE = "#ef4444";
const VIEWPORT_FILL = "rgba(239, 68, 68, 0.12)";
const SELECTED_CELL_STROKE = "#f97316";
const MINIMAP_STROKE_WIDTH = 2;

interface Props {
  cells: Cell[];
  snapshotUrl: string | null;
  backgroundImageUrl: string | null;
  gridX: number;
  gridY: number;
  viewport: Viewport | null;
  selectedCell: Cell | null;
  onNavigate: (x: number, y: number, behavior?: ScrollBehavior) => void;
}

function getInsetStrokeRect(
  x: number,
  y: number,
  width: number,
  height: number,
  lineWidth: number,
  maxWidth: number,
  maxHeight: number,
) {
  const inset = lineWidth / 2;

  const safeX = Math.max(inset, x + inset);
  const safeY = Math.max(inset, y + inset);
  const safeRight = Math.min(maxWidth - inset, x + width - inset);
  const safeBottom = Math.min(maxHeight - inset, y + height - inset);

  return {
    x: safeX,
    y: safeY,
    width: Math.max(0, safeRight - safeX),
    height: Math.max(0, safeBottom - safeY),
  };
}

function getClampedViewportRect(
  x: number,
  y: number,
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
) {
  const safeX = Math.max(0, Math.min(x, maxWidth));
  const safeY = Math.max(0, Math.min(y, maxHeight));
  const safeRight = Math.max(0, Math.min(x + width, maxWidth));
  const safeBottom = Math.max(0, Math.min(y + height, maxHeight));

  return {
    x: safeX,
    y: safeY,
    width: Math.max(0, safeRight - safeX),
    height: Math.max(0, safeBottom - safeY),
  };
}

function getClampedMarkerRect(
  x: number,
  y: number,
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
) {
  const markerSize = Math.max(
    2,
    Math.floor(Math.min(Math.max(width, 2), Math.max(height, 2), 4)),
  );
  const safeX = Math.min(Math.max(x, 0), Math.max(0, maxWidth - markerSize));
  const safeY = Math.min(Math.max(y, 0), Math.max(0, maxHeight - markerSize));

  return {
    x: safeX,
    y: safeY,
    size: markerSize,
  };
}

export default function MiniMap({
  cells,
  snapshotUrl,
  backgroundImageUrl,
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

    if (!snapshotUrl && !backgroundImageUrl) {
      for (const cell of cells) {
        if (!cell.color) {
          continue;
        }

        ctx.fillStyle = cell.color;
        ctx.fillRect(
          cell.x * cellWidth,
          cell.y * cellHeight,
          Math.max(cellWidth, 1),
          Math.max(cellHeight, 1),
        );
      }
    }

    if (viewport) {
      const viewportRect = getClampedViewportRect(
        viewport.left,
        viewport.top,
        viewport.width,
        viewport.height,
        canvas.width,
        canvas.height,
      );

      ctx.save();
      ctx.fillStyle = VIEWPORT_FILL;
      ctx.strokeStyle = VIEWPORT_STROKE;
      ctx.lineWidth = MINIMAP_STROKE_WIDTH;
      ctx.fillRect(
        viewportRect.x,
        viewportRect.y,
        viewportRect.width,
        viewportRect.height,
      );
      ctx.strokeRect(
        viewportRect.x + MINIMAP_STROKE_WIDTH / 2,
        viewportRect.y + MINIMAP_STROKE_WIDTH / 2,
        Math.max(0, viewportRect.width - MINIMAP_STROKE_WIDTH),
        Math.max(0, viewportRect.height - MINIMAP_STROKE_WIDTH),
      );
      ctx.restore();
    }

    if (selectedCell) {
      const rawX = selectedCell.x * cellWidth;
      const rawY = selectedCell.y * cellHeight;
      const rawWidth = Math.max(cellWidth, 1);
      const rawHeight = Math.max(cellHeight, 1);

      ctx.save();
      ctx.strokeStyle = SELECTED_CELL_STROKE;
      ctx.fillStyle = SELECTED_CELL_STROKE;
      ctx.lineWidth = MINIMAP_STROKE_WIDTH;

      if (rawWidth <= 4 || rawHeight <= 4) {
        const markerRect = getClampedMarkerRect(
          rawX,
          rawY,
          rawWidth,
          rawHeight,
          canvas.width,
          canvas.height,
        );

        ctx.fillRect(
          markerRect.x,
          markerRect.y,
          markerRect.size,
          markerRect.size,
        );
      } else {
        const selectedRect = getInsetStrokeRect(
          rawX,
          rawY,
          rawWidth,
          rawHeight,
          MINIMAP_STROKE_WIDTH,
          canvas.width,
          canvas.height,
        );

        ctx.strokeRect(
          selectedRect.x,
          selectedRect.y,
          selectedRect.width,
          selectedRect.height,
        );
      }

      ctx.restore();
    }
  }, [
    backgroundImageUrl,
    cells,
    gridX,
    gridY,
    minimapDimensions.width,
    minimapDimensions.height,
    selectedCell,
    snapshotUrl,
    viewport,
  ]);

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
      <div className="relative flex h-[220px] w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0 shadow-sm">
        {(snapshotUrl || backgroundImageUrl) && (
          <img
            src={snapshotUrl ?? backgroundImageUrl ?? undefined}
            alt="미니맵 스냅샷"
            className="pointer-events-none absolute block h-full w-full select-none"
            style={{
              width: `${minimapDimensions.width}px`,
              height: `${minimapDimensions.height}px`,
              imageRendering: "pixelated",
            }}
            draggable={false}
          />
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={(event) => {
            isDraggingRef.current = true;
            navigateFromPointer(event.clientX, event.clientY, "auto");
          }}
          onDragStart={(event) => event.preventDefault()}
          className="relative z-[1] block cursor-crosshair bg-transparent"
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
