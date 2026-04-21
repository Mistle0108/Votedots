import { getGameConfig } from "@/shared/config/game-config";
import { MINIMAP_SIZE } from "./canvas.constants";
import type { Viewport, VisibleCellBounds } from "./canvas.types";

interface CalculateViewportParams {
  gridX: number;
  gridY: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateViewport({
  gridX,
  gridY,
  cameraX,
  cameraY,
  zoom,
  viewportWidth,
  viewportHeight,
}: CalculateViewportParams): Viewport | null {
  if (gridX === 0 || gridY === 0 || zoom <= 0) {
    return null;
  }

  const cellSize = getGameConfig().board.cellSize;
  const worldWidth = gridX * cellSize;
  const worldHeight = gridY * cellSize;

  const visibleWorldWidth = viewportWidth / zoom;
  const visibleWorldHeight = viewportHeight / zoom;

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
