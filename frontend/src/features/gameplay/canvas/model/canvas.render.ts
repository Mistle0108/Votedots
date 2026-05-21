import { getGameConfig } from "@/shared/config/game-config";
import { SELECTED_STROKE_COLOR, VOTING_STROKE_COLOR } from "./canvas.constants";
import type { Cell } from "./canvas.types";

interface RenderPaintWorldCacheParams {
  ctx: CanvasRenderingContext2D;
  cells: Cell[];
  worldWidth: number;
  worldHeight: number;
}

interface DrawPaintLayerFromCacheParams {
  ctx: CanvasRenderingContext2D;
  sourceCanvas: HTMLCanvasElement;
  cameraX: number;
  cameraY: number;
  zoom: number;
  worldWidth: number;
  worldHeight: number;
  worldOffsetX: number;
  worldOffsetY: number;
}
interface RenderOverlayLayerParams {
  ctx: CanvasRenderingContext2D;
  selectedCell: Cell | null;
  previewColor: string | null;
  votingCellIds: Set<string>;
  topColorMap: Map<string, string>;
  cameraX: number;
  cameraY: number;
  zoom: number;
  worldOffsetX: number;
  worldOffsetY: number;
  isDraggingCanvas?: boolean;
  timestamp?: number;
}

function clearCanvas(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

function getScreenCellRect(
  cellX: number,
  cellY: number,
  cellSize: number,
  cameraX: number,
  cameraY: number,
  zoom: number,
  worldOffsetX: number,
  worldOffsetY: number,
) {
  const size = cellSize * zoom;

  return {
    x: worldOffsetX + (cellX * cellSize - cameraX) * zoom,
    y: worldOffsetY + (cellY * cellSize - cameraY) * zoom,
    size,
  };
}

function getStrokeMetrics(size: number) {
  const lineWidth = Math.max(2, Math.min(3, size * 0.18));
  const inset = lineWidth / 2;

  return {
    inset,
    strokeSize: Math.max(0, size - lineWidth),
    lineWidth,
  };
}

function isScreenRectVisible(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const rect = ctx.canvas.getBoundingClientRect();

  return x + size > 0 && x < rect.width && y + size > 0 && y < rect.height;
}
export function renderPaintWorldCache({
  ctx,
  cells,
  worldWidth,
  worldHeight,
}: RenderPaintWorldCacheParams) {
  clearCanvas(ctx);

  if (worldWidth <= 0 || worldHeight <= 0) {
    return;
  }

  const cellSize = getGameConfig().board.cellSize;
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  for (const cell of cells) {
    if (!cell.color) {
      continue;
    }

    ctx.fillStyle = cell.color;
    ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
  }

  ctx.restore();
}

export function drawPaintLayerFromCache({
  ctx,
  sourceCanvas,
  cameraX,
  cameraY,
  zoom,
  worldWidth,
  worldHeight,
  worldOffsetX,
  worldOffsetY,
}: DrawPaintLayerFromCacheParams) {
  clearCanvas(ctx);

  if (
    worldWidth <= 0 ||
    worldHeight <= 0 ||
    zoom <= 0 ||
    sourceCanvas.width === 0 ||
    sourceCanvas.height === 0
  ) {
    return;
  }

  const backgroundTranslateX = worldOffsetX - cameraX * zoom;
  const backgroundTranslateY = worldOffsetY - cameraY * zoom;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sourceCanvas,
    backgroundTranslateX,
    backgroundTranslateY,
    worldWidth * zoom,
    worldHeight * zoom,
  );
  ctx.restore();
}

export function renderOverlayLayer({
  ctx,
  selectedCell,
  previewColor,
  votingCellIds,
  topColorMap,
  cameraX,
  cameraY,
  zoom,
  worldOffsetX,
  worldOffsetY,
  isDraggingCanvas = false,
  timestamp = 0,
}: RenderOverlayLayerParams) {
  clearCanvas(ctx);

  const cellSize = getGameConfig().board.cellSize;
  const pulse = isDraggingCanvas ? 0.5 : (Math.sin(timestamp / 220) + 1) / 2;
  const overlayAlpha = isDraggingCanvas ? 0.4 : 0.25 + pulse * 0.35;
  const dashOffset = isDraggingCanvas ? 0 : -((timestamp / 90) % 8);
  for (const cellKey of votingCellIds) {
    const [xValue, yValue] = cellKey.split(":");
    const x = Number(xValue);
    const y = Number(yValue);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }

    const isSelected = selectedCell?.x === x && selectedCell?.y === y;
    const topColor = topColorMap.get(cellKey);
    const rect = getScreenCellRect(
      x,
      y,
      cellSize,
      cameraX,
      cameraY,
      zoom,
      worldOffsetX,
      worldOffsetY,
    );

    if (!isScreenRectVisible(ctx, rect.x, rect.y, rect.size)) {
      continue;
    }

    const { inset, strokeSize, lineWidth } = getStrokeMetrics(rect.size);

    if (topColor && !isSelected) {
      ctx.save();
      ctx.fillStyle = topColor;
      ctx.globalAlpha = overlayAlpha;
      ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
      ctx.restore();
    }

    if (!isSelected && strokeSize > 0) {
      ctx.save();
      ctx.strokeStyle = VOTING_STROKE_COLOR;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash(!isDraggingCanvas && rect.size >= 8 ? [4, 4] : []);
      ctx.lineDashOffset = !isDraggingCanvas && rect.size >= 8 ? dashOffset : 0;
      ctx.strokeRect(rect.x + inset, rect.y + inset, strokeSize, strokeSize);
      ctx.restore();
    }
  }

  if (selectedCell) {
    const rect = getScreenCellRect(
      selectedCell.x,
      selectedCell.y,
      cellSize,
      cameraX,
      cameraY,
      zoom,
      worldOffsetX,
      worldOffsetY,
    );
    const screenVisible = isScreenRectVisible(ctx, rect.x, rect.y, rect.size);

    if (screenVisible) {
      const { inset, strokeSize, lineWidth } = getStrokeMetrics(rect.size);

      if (previewColor) {
        ctx.save();
        ctx.fillStyle = previewColor;
        ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
        ctx.restore();
      }

      if (strokeSize > 0) {
        ctx.save();
        ctx.setLineDash([]);
        ctx.strokeStyle = SELECTED_STROKE_COLOR;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(rect.x + inset, rect.y + inset, strokeSize, strokeSize);
        ctx.restore();
      }
    }
  }
}
