import { useEffect, useRef, type RefObject } from "react";
import { renderCanvas } from "../model/canvas.render";
import { Cell } from "../model/canvas.types";

interface UseCanvasRendererParams {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasReady: boolean;
  cellsRef: RefObject<Cell[]>;
  selectedCellRef: RefObject<Cell | null>;
  previewColorRef: RefObject<string | null>;
  votingCellIdsRef: RefObject<Set<string>>;
  topColorMapRef: RefObject<Map<string, string>>;
}

export function useCanvasRenderer({
  canvasRef,
  canvasReady,
  cellsRef,
  selectedCellRef,
  previewColorRef,
  votingCellIdsRef,
  topColorMapRef,
}: UseCanvasRendererParams) {
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasReady) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = (timestamp: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      renderCanvas({
        ctx,
        canvas,
        cells: cellsRef.current,
        selectedCell: selectedCellRef.current,
        previewColor: previewColorRef.current,
        votingCellIds: votingCellIdsRef.current,
        topColorMap: topColorMapRef.current,
        timestamp,
      });

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [
    canvasReady,
    canvasRef,
    cellsRef,
    previewColorRef,
    selectedCellRef,
    topColorMapRef,
    votingCellIdsRef,
  ]);
}
