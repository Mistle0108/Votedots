import { PANEL_WIDTH } from "@/features/gameplay/canvas";

export const HISTORY_PANEL_WIDTH = 88;
const MODAL_EDGE_GAP = 12;
const MODAL_TOP_OFFSET = 24;

export function getCanvasTopCenterModalPosition(modalWidth: number) {
  const viewportWidth = window.innerWidth;
  const canvasAreaLeft = HISTORY_PANEL_WIDTH;
  const canvasAreaRight = Math.max(canvasAreaLeft, viewportWidth - PANEL_WIDTH);
  const canvasAreaWidth = Math.max(0, canvasAreaRight - canvasAreaLeft);
  const fittedModalWidth = Math.min(modalWidth, viewportWidth - MODAL_EDGE_GAP * 2);
  const centeredX =
    canvasAreaLeft + Math.round((canvasAreaWidth - fittedModalWidth) / 2);
  const maxX = viewportWidth - fittedModalWidth - MODAL_EDGE_GAP;

  return {
    x: Math.max(MODAL_EDGE_GAP, Math.min(centeredX, maxX)),
    y: MODAL_TOP_OFFSET,
  };
}
