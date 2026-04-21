import { getGameConfig } from "@/shared/config/game-config";
import { SELECTED_STROKE_COLOR, VOTING_STROKE_COLOR } from "./canvas.constants";
import type { Cell, VisibleCellBounds } from "./canvas.types";

interface RenderPaintLayerParams {
  ctx: CanvasRenderingContext2D;
  cells: Cell[];
  visibleCellBounds: VisibleCellBounds | null;
  cameraX: number;
  cameraY: number;
  zoom: number;
  worldOffsetX: number;
  worldOffsetY: number;
}
interface RenderOverlayLayerParams {
  ctx: CanvasRenderingContext2D;
  selectedCell: Cell | null;
  previewColor: string | null;
  votingCellIds: Set<string>;
  topColorMap: Map<string, string>;
  visibleCellBounds: VisibleCellBounds | null;
  cameraX: number;
  cameraY: number;
  zoom: number;
  worldOffsetX: number;
  worldOffsetY: number;
  timestamp?: number;
}

function isVisible(
  x: number,
  y: number,
  bounds: VisibleCellBounds | null,
): boolean {
  if (!bounds) {
    return false;
  }

  return (
    x >= bounds.startCellX &&
    x <= bounds.endCellX &&
    y >= bounds.startCellY &&
    y <= bounds.endCellY
  );
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
export function renderPaintLayer({
  ctx,
  cells,
  visibleCellBounds,
  cameraX,
  cameraY,
  zoom,
  worldOffsetX,
  worldOffsetY,
}: RenderPaintLayerParams) {
  clearCanvas(ctx);

  if (!visibleCellBounds) {
    return;
  }

  const cellSize = getGameConfig().board.cellSize;

  for (const cell of cells) {
    if (!cell.color || !isVisible(cell.x, cell.y, visibleCellBounds)) {
      continue;
    }

    const rect = getScreenCellRect(
      cell.x,
      cell.y,
      cellSize,
      cameraX,
      cameraY,
      zoom,
      worldOffsetX,
      worldOffsetY,
    );

    ctx.fillStyle = cell.color;
    ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
  }
}

export function renderOverlayLayer({
  ctx,
  selectedCell,
  previewColor,
  votingCellIds,
  topColorMap,
  visibleCellBounds,
  cameraX,
  cameraY,
  zoom,
  worldOffsetX,
  worldOffsetY,
  timestamp = 0,
}: RenderOverlayLayerParams) {
  clearCanvas(ctx);

  if (!visibleCellBounds) {
    return;
  }

  const cellSize = getGameConfig().board.cellSize;
  const pulse = (Math.sin(timestamp / 220) + 1) / 2;
  const overlayAlpha = 0.25 + pulse * 0.35;
  const dashOffset = -((timestamp / 90) % 8);
  for (const cellKey of votingCellIds) {
    const [xValue, yValue] = cellKey.split(":");
    const x = Number(xValue);
    const y = Number(yValue);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }

    if (!isVisible(x, y, visibleCellBounds)) {
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
      ctx.setLineDash(rect.size >= 8 ? [4, 4] : []);
      ctx.lineDashOffset = rect.size >= 8 ? dashOffset : 0;
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
