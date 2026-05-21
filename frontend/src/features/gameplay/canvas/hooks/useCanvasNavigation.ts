import {
  useCallback,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { getGameConfig } from "@/shared/config/game-config";
import {
  getUsableViewportSize,
  type CanvasViewportPadding,
} from "../model/viewport";

interface UseCanvasNavigationParams {
  containerRef: RefObject<HTMLDivElement | null>;
  gridX: number;
  gridY: number;
  zoom: number;
  setCameraX: Dispatch<SetStateAction<number>>;
  setCameraY: Dispatch<SetStateAction<number>>;
  viewportPadding?: CanvasViewportPadding;
}

interface CoordinateLike {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveCoordinate(
  xOrPoint: number | CoordinateLike,
  maybeY?: number,
): CoordinateLike {
  if (typeof xOrPoint === "number") {
    return {
      x: xOrPoint,
      y: maybeY ?? 0,
    };
  }

  return xOrPoint;
}

export function useCanvasNavigation({
  containerRef,
  gridX,
  gridY,
  zoom,
  setCameraX,
  setCameraY,
  viewportPadding,
}: UseCanvasNavigationParams) {
  const navigateToCoordinate = useCallback(
    (xOrPoint: number | CoordinateLike, maybeY?: number) => {
      const container = containerRef.current;

      if (!container || gridX === 0 || gridY === 0 || zoom <= 0) {
        return;
      }

      const { x, y } = resolveCoordinate(xOrPoint, maybeY);
      const cellSize = getGameConfig().board.cellSize;

      const worldWidth = gridX * cellSize;
      const worldHeight = gridY * cellSize;

      const usableViewport = getUsableViewportSize({
        viewportWidth: container.clientWidth,
        viewportHeight: container.clientHeight,
        viewportPadding,
      });
      const viewportWorldWidth = usableViewport.width / zoom;
      const viewportWorldHeight = usableViewport.height / zoom;

      const targetWorldCenterX = x * cellSize + cellSize / 2;
      const targetWorldCenterY = y * cellSize + cellSize / 2;

      const nextCameraX = clamp(
        targetWorldCenterX - viewportWorldWidth / 2,
        0,
        Math.max(0, worldWidth - viewportWorldWidth),
      );

      const nextCameraY = clamp(
        targetWorldCenterY - viewportWorldHeight / 2,
        0,
        Math.max(0, worldHeight - viewportWorldHeight),
      );

      setCameraX(nextCameraX);
      setCameraY(nextCameraY);
    },
    [containerRef, gridX, gridY, zoom, setCameraX, setCameraY, viewportPadding],
  );

  return {
    navigateToCoordinate,
  };
}
