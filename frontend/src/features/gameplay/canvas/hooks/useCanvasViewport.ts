import { useCallback, useEffect, useState, type RefObject } from "react";
import { calculateViewport } from "../model/viewport";
import { Viewport } from "../model/canvas.types";

interface UseCanvasViewportParams {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  gridX: number;
  gridY: number;
  canvasReady: boolean;
}

export function useCanvasViewport({
  containerRef,
  canvasRef,
  gridX,
  gridY,
  canvasReady,
}: UseCanvasViewportParams) {
  const [viewport, setViewport] = useState<Viewport | null>(null);

  const updateViewport = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) {
      setViewport(null);
      return;
    }

    setViewport(
      calculateViewport({
        container,
        canvas,
        gridX,
        gridY,
      }),
    );
  }, [canvasRef, containerRef, gridX, gridY]);

  useEffect(() => {
    if (!canvasReady) return;

    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateViewport();
    };

    updateViewport();

    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [canvasReady, containerRef, updateViewport]);

  return {
    viewport,
    updateViewport,
  };
}
