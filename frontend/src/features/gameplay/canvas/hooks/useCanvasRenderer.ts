import { useEffect, useRef, type RefObject } from "react";
import {
  drawPaintLayerFromCache,
  renderOverlayLayer,
  renderPaintWorldCache,
} from "../model/canvas.render";
import type { Cell } from "../model/canvas.types";

interface UseCanvasRendererParams {
  paintCanvasRef: RefObject<HTMLCanvasElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasReady: boolean;
  cells: Cell[];
  selectedCell: Cell | null;
  previewColor: string | null;
  votingCellIds: Set<string>;
  topColorMap: Map<string, string>;
  cameraX: number;
  cameraY: number;
  zoom: number;
  worldOffsetX: number;
  worldOffsetY: number;
  isDraggingCanvas: boolean;
  worldWidth: number;
  worldHeight: number;
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
  cameraX,
  cameraY,
  zoom,
  worldOffsetX,
  worldOffsetY,
  isDraggingCanvas,
  worldWidth,
  worldHeight,
}: UseCanvasRendererParams) {
  const paintWorldCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasReady || worldWidth <= 0 || worldHeight <= 0) {
      paintWorldCanvasRef.current = null;
      return;
    }

    const paintWorldCanvas =
      paintWorldCanvasRef.current ?? document.createElement("canvas");

    paintWorldCanvasRef.current = paintWorldCanvas;

    if (
      paintWorldCanvas.width !== Math.ceil(worldWidth) ||
      paintWorldCanvas.height !== Math.ceil(worldHeight)
    ) {
      paintWorldCanvas.width = Math.ceil(worldWidth);
      paintWorldCanvas.height = Math.ceil(worldHeight);
    }

    const paintWorldCtx = paintWorldCanvas.getContext("2d");

    if (!paintWorldCtx) {
      return;
    }

    renderPaintWorldCache({
      ctx: paintWorldCtx,
      cells,
      worldWidth,
      worldHeight,
    });
  }, [canvasReady, cells, worldWidth, worldHeight]);

  useEffect(() => {
    if (!canvasReady) {
      return;
    }

    const paintCanvas = paintCanvasRef.current;
    const paintCtx = paintCanvas?.getContext("2d");
    const paintWorldCanvas = paintWorldCanvasRef.current;

    if (!paintCanvas || !paintCtx) {
      return;
    }

    if (!paintWorldCanvas) {
      paintCtx.save();
      paintCtx.setTransform(1, 0, 0, 1, 0, 0);
      paintCtx.clearRect(0, 0, paintCtx.canvas.width, paintCtx.canvas.height);
      paintCtx.restore();
      return;
    }

    drawPaintLayerFromCache({
      ctx: paintCtx,
      sourceCanvas: paintWorldCanvas,
      cameraX,
      cameraY,
      zoom,
      worldWidth,
      worldHeight,
      worldOffsetX,
      worldOffsetY,
    });
  }, [
    paintCanvasRef,
    canvasReady,
    cells,
    cameraX,
    cameraY,
    zoom,
    worldOffsetX,
    worldOffsetY,
    worldWidth,
    worldHeight,
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
        cameraX,
        cameraY,
        zoom,
        worldOffsetX,
        worldOffsetY,
        isDraggingCanvas,
        timestamp,
      });
    };

    drawOverlay();

    if (votingCellIds.size === 0 || isDraggingCanvas) {
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
    cameraX,
    cameraY,
    zoom,
    worldOffsetX,
    worldOffsetY,
    isDraggingCanvas,
  ]);
}
