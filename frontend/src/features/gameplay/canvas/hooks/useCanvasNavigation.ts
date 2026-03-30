import { useCallback, type RefObject } from "react";
import { CELL_SIZE } from "../model/canvas.constants";

interface UseCanvasNavigationParams {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  updateViewport: () => void;
}

export function useCanvasNavigation({
  containerRef,
  canvasRef,
  updateViewport,
}: UseCanvasNavigationParams) {
  const navigateToCoordinate = useCallback(
    (x: number, y: number, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      const canvas = canvasRef.current;

      if (!container || !canvas) return;

      const targetX = x * CELL_SIZE + CELL_SIZE / 2;
      const targetY = y * CELL_SIZE + CELL_SIZE / 2;

      const nextScrollLeft =
        canvas.offsetLeft + targetX - container.clientWidth / 2;
      const nextScrollTop =
        canvas.offsetTop + targetY - container.clientHeight / 2;

      const maxScrollLeft = Math.max(
        0,
        container.scrollWidth - container.clientWidth,
      );
      const maxScrollTop = Math.max(
        0,
        container.scrollHeight - container.clientHeight,
      );

      container.scrollTo({
        left: Math.min(Math.max(0, nextScrollLeft), maxScrollLeft),
        top: Math.min(Math.max(0, nextScrollTop), maxScrollTop),
        behavior,
      });

      requestAnimationFrame(() => {
        updateViewport();
      });
    },
    [canvasRef, containerRef, updateViewport],
  );

  return {
    navigateToCoordinate,
  };
}
