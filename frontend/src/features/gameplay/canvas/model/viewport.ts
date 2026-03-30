import { MINIMAP_SIZE } from "./canvas.constants";
import { Viewport } from "./canvas.types";

interface CalculateViewportParams {
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  gridX: number;
  gridY: number;
}

export function calculateViewport({
  container,
  canvas,
  gridX,
  gridY,
}: CalculateViewportParams): Viewport | null {
  if (gridX === 0 || gridY === 0) {
    return null;
  }

  const minimapScale = MINIMAP_SIZE / Math.max(gridX, gridY, 1);
  const minimapWidth = gridX * minimapScale;
  const minimapHeight = gridY * minimapScale;

  const visibleLeft = container.scrollLeft;
  const visibleTop = container.scrollTop;
  const visibleRight = visibleLeft + container.clientWidth;
  const visibleBottom = visibleTop + container.clientHeight;

  const canvasLeft = canvas.offsetLeft;
  const canvasTop = canvas.offsetTop;

  const canvasVisibleLeft = Math.max(0, visibleLeft - canvasLeft);
  const canvasVisibleTop = Math.max(0, visibleTop - canvasTop);
  const canvasVisibleRight = Math.min(canvas.width, visibleRight - canvasLeft);
  const canvasVisibleBottom = Math.min(
    canvas.height,
    visibleBottom - canvasTop,
  );

  const visibleWidth = Math.max(0, canvasVisibleRight - canvasVisibleLeft);
  const visibleHeight = Math.max(0, canvasVisibleBottom - canvasVisibleTop);

  const nextWidth = Math.min(
    minimapWidth,
    (visibleWidth / canvas.width) * minimapWidth,
  );
  const nextHeight = Math.min(
    minimapHeight,
    (visibleHeight / canvas.height) * minimapHeight,
  );

  const nextLeft = Math.min(
    Math.max(0, (canvasVisibleLeft / canvas.width) * minimapWidth),
    Math.max(0, minimapWidth - nextWidth),
  );
  const nextTop = Math.min(
    Math.max(0, (canvasVisibleTop / canvas.height) * minimapHeight),
    Math.max(0, minimapHeight - nextHeight),
  );

  return {
    left: nextLeft,
    top: nextTop,
    width: nextWidth,
    height: nextHeight,
  };
}
