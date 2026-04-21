import { useEffect, type RefObject } from "react";
import { renderOverlayLayer, renderPaintLayer } from "../model/canvas.render";
import type { Cell, VisibleCellBounds } from "../model/canvas.types";

interface UseCanvasRendererParams {
  paintCanvasRef: RefObject<HTMLCanvasElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasReady: boolean;
  cells: Cell[];
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
}

export function useCanvasRenderer({
  paintCanvasRef,
  canvasRef,
  canvasReady,
  cells,
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
}: UseCanvasRendererParams) {
  useEffect(() => {
    if (!canvasReady) {
      return;
    }

    const paintCanvas = paintCanvasRef.current;
    const paintCtx = paintCanvas?.getContext("2d");

    if (!paintCanvas || !paintCtx) {
      return;
    }

    renderPaintLayer({
      ctx: paintCtx,
      cells,
      visibleCellBounds,
      cameraX,
      cameraY,
      zoom,
      worldOffsetX,
      worldOffsetY,
    });
  }, [
    paintCanvasRef,
    canvasReady,
    cells,
    visibleCellBounds,
    cameraX,
    cameraY,
    zoom,
    worldOffsetX,
    worldOffsetY,
  ]);

  useEffect(() => {
    if (!canvasReady) {
      return;
    }

    const overlayCanvas = canvasRef.current;
    const overlayCtx = overlayCanvas?.getContext("2d");

    if (!overlayCanvas || !overlayCtx) {
      return;
    }

    let frameId = 0;

    const drawOverlay = (timestamp = 0) => {
      renderOverlayLayer({
        ctx: overlayCtx,
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
        timestamp,
      });
    };

    drawOverlay();

    if (votingCellIds.size === 0) {
      return;
    }

    const animate = (timestamp: number) => {
      drawOverlay(timestamp);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [
    canvasRef,
    canvasReady,
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
  ]);
}
