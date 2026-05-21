import { getGameConfig } from "@/shared/config/game-config";
import { MINIMAP_SIZE } from "./canvas.constants";
import type { Viewport, VisibleCellBounds } from "./canvas.types";

export interface CanvasViewportPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface CalculateViewportParams {
  gridX: number;
  gridY: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  viewportPadding?: CanvasViewportPadding;
}

interface CalculateWorldScreenOffsetParams {
  worldWidth: number;
  worldHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
  viewportPadding?: CanvasViewportPadding;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function resolveViewportPadding(
  viewportPadding?: Partial<CanvasViewportPadding> | null,
): CanvasViewportPadding {
  return {
    top: Math.max(0, viewportPadding?.top ?? 0),
    right: Math.max(0, viewportPadding?.right ?? 0),
    bottom: Math.max(0, viewportPadding?.bottom ?? 0),
    left: Math.max(0, viewportPadding?.left ?? 0),
  };
}

export function getUsableViewportSize(params: {
  viewportWidth: number;
  viewportHeight: number;
  viewportPadding?: Partial<CanvasViewportPadding> | null;
}) {
  const { viewportWidth, viewportHeight, viewportPadding } = params;
  const padding = resolveViewportPadding(viewportPadding);

  return {
    width: Math.max(0, viewportWidth - padding.left - padding.right),
    height: Math.max(0, viewportHeight - padding.top - padding.bottom),
  };
}

export function calculateWorldScreenOffset({
  worldWidth,
  worldHeight,
  viewportWidth,
  viewportHeight,
  zoom,
  viewportPadding,
}: CalculateWorldScreenOffsetParams) {
  const padding = resolveViewportPadding(viewportPadding);
  const usableViewport = getUsableViewportSize({
    viewportWidth,
    viewportHeight,
    viewportPadding: padding,
  });

  if (
    worldWidth <= 0 ||
    worldHeight <= 0 ||
    usableViewport.width <= 0 ||
    usableViewport.height <= 0 ||
    zoom <= 0
  ) {
    return {
      x: 0,
      y: 0,
    };
  }

  return {
    x: padding.left + Math.max(0, (usableViewport.width - worldWidth * zoom) / 2),
    y: padding.top + Math.max(0, (usableViewport.height - worldHeight * zoom) / 2),
  };
}

export function calculateViewport({
  gridX,
  gridY,
  cameraX,
  cameraY,
  zoom,
  viewportWidth,
  viewportHeight,
  viewportPadding,
}: CalculateViewportParams): Viewport | null {
  if (gridX === 0 || gridY === 0 || zoom <= 0) {
    return null;
  }

  const cellSize = getGameConfig().board.cellSize;
  const worldWidth = gridX * cellSize;
  const worldHeight = gridY * cellSize;
  const usableViewport = getUsableViewportSize({
    viewportWidth,
    viewportHeight,
    viewportPadding,
  });
  const visibleWorldWidth = usableViewport.width / zoom;
  const visibleWorldHeight = usableViewport.height / zoom;

  const minimapScale = MINIMAP_SIZE / Math.max(gridX, gridY, 1);
  const minimapWidth = gridX * minimapScale;
  const minimapHeight = gridY * minimapScale;

  const nextWidth = Math.min(
    minimapWidth,
    (visibleWorldWidth / worldWidth) * minimapWidth,
  );
  const nextHeight = Math.min(
    minimapHeight,
    (visibleWorldHeight / worldHeight) * minimapHeight,
  );

  const nextLeft = clamp(
    (cameraX / worldWidth) * minimapWidth,
    0,
    Math.max(0, minimapWidth - nextWidth),
  );

  const nextTop = clamp(
    (cameraY / worldHeight) * minimapHeight,
    0,
    Math.max(0, minimapHeight - nextHeight),
  );

  return {
    left: nextLeft,
    top: nextTop,
    width: nextWidth,
    height: nextHeight,
  };
}

export function calculateVisibleCellBounds({
  gridX,
  gridY,
  cameraX,
  cameraY,
  zoom,
  viewportWidth,
  viewportHeight,
}: CalculateViewportParams): VisibleCellBounds | null {
  if (gridX === 0 || gridY === 0 || zoom <= 0) {
    return null;
  }

  const cellSize = getGameConfig().board.cellSize;
  const visibleWorldWidth = viewportWidth / zoom;
  const visibleWorldHeight = viewportHeight / zoom;

  if (visibleWorldWidth <= 0 || visibleWorldHeight <= 0) {
    return null;
  }

  return {
    startCellX: Math.max(0, Math.floor(cameraX / cellSize)),
    endCellX: Math.min(
      gridX - 1,
      Math.ceil((cameraX + visibleWorldWidth) / cellSize) - 1,
    ),
    startCellY: Math.max(0, Math.floor(cameraY / cellSize)),
    endCellY: Math.min(
      gridY - 1,
      Math.ceil((cameraY + visibleWorldHeight) / cellSize) - 1,
    ),
  };
}
