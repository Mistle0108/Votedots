import { useCallback, useEffect, useState, type RefObject } from "react";
import {
  calculateViewport,
  calculateVisibleCellBounds,
} from "../model/viewport";
import type { Viewport, VisibleCellBounds } from "../model/canvas.types";

interface UseCanvasViewportParams {
  containerRef: RefObject<HTMLDivElement | null>;
  gridX: number;
  gridY: number;
  canvasReady: boolean;
  cameraX: number;
  cameraY: number;
  zoom: number;
}

export function useCanvasViewport({
  containerRef,
  gridX,
  gridY,
  canvasReady,
  cameraX,
  cameraY,
  zoom,
}: UseCanvasViewportParams) {
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [visibleCellBounds, setVisibleCellBounds] =
    useState<VisibleCellBounds | null>(null);

  const updateViewport = useCallback(() => {
    const container = containerRef.current;

    if (!container || gridX === 0 || gridY === 0 || zoom <= 0) {
      setViewport(null);
      setVisibleCellBounds(null);
      return;
    }

    const viewportWidth = container.clientWidth;
    const viewportHeight = container.clientHeight;

    if (viewportWidth <= 0 || viewportHeight <= 0) {
      setViewport(null);
      setVisibleCellBounds(null);
      return;
    }

    setViewport(
      calculateViewport({
        gridX,
        gridY,
        cameraX,
        cameraY,
        zoom,
        viewportWidth,
        viewportHeight,
      }),
    );

    setVisibleCellBounds(
      calculateVisibleCellBounds({
        gridX,
        gridY,
        cameraX,
        cameraY,
        zoom,
        viewportWidth,
        viewportHeight,
      }),
    );
  }, [containerRef, gridX, gridY, cameraX, cameraY, zoom]);

  useEffect(() => {
    if (!canvasReady) {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    updateViewport();

    const observer = new ResizeObserver(() => {
      updateViewport();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [canvasReady, containerRef, updateViewport]);

  return {
    viewport: canvasReady ? viewport : null,
    visibleCellBounds: canvasReady ? visibleCellBounds : null,
    updateViewport,
  };
}
