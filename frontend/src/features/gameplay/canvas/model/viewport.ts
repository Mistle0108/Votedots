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
  const renderedCanvasWidth = canvas.offsetWidth;
  const renderedCanvasHeight = canvas.offsetHeight;

  const canvasVisibleLeft = Math.max(0, visibleLeft - canvasLeft);
  const canvasVisibleTop = Math.max(0, visibleTop - canvasTop);
  const canvasVisibleRight = Math.min(
    renderedCanvasWidth,
    visibleRight - canvasLeft,
  );
  const canvasVisibleBottom = Math.min(
    renderedCanvasHeight,
    visibleBottom - canvasTop,
  );

  const visibleWidth = Math.max(0, canvasVisibleRight - canvasVisibleLeft);
  const visibleHeight = Math.max(0, canvasVisibleBottom - canvasVisibleTop);

  const nextWidth = Math.min(
    minimapWidth,
    (visibleWidth / renderedCanvasWidth) * minimapWidth,
  );
  const nextHeight = Math.min(
    minimapHeight,
    (visibleHeight / renderedCanvasHeight) * minimapHeight,
  );

  const nextLeft = Math.min(
    Math.max(0, (canvasVisibleLeft / renderedCanvasWidth) * minimapWidth),
    Math.max(0, minimapWidth - nextWidth),
  );
  const nextTop = Math.min(
    Math.max(0, (canvasVisibleTop / renderedCanvasHeight) * minimapHeight),
    Math.max(0, minimapHeight - nextHeight),
  );

  return {
    left: nextLeft,
    top: nextTop,
    width: nextWidth,
    height: nextHeight,
  };
}
