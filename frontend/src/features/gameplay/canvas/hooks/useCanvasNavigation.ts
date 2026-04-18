import { useCallback, type RefObject } from "react";

interface UseCanvasNavigationParams {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  gridX: number;
  gridY: number;
  updateViewport: () => void;
}

export function useCanvasNavigation({
  containerRef,
  canvasRef,
  gridX,
  gridY,
  updateViewport,
}: UseCanvasNavigationParams) {
  const navigateToCoordinate = useCallback(
    (x: number, y: number, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      const canvas = canvasRef.current;

      if (!container || !canvas || gridX === 0 || gridY === 0) return;

      const cellWidth = canvas.offsetWidth / gridX;
      const cellHeight = canvas.offsetHeight / gridY;

      const targetX = x * cellWidth + cellWidth / 2;
      const targetY = y * cellHeight + cellHeight / 2;

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
    [canvasRef, containerRef, gridX, gridY, updateViewport],
  );

  return {
    navigateToCoordinate,
  };
}
