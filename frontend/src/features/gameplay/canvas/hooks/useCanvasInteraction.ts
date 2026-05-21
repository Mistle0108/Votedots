import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { getGameConfig } from "@/shared/config/game-config";
import { Cell } from "../model/canvas.types";

const MOUSE_TAP_DISTANCE_THRESHOLD = 6;
const TOUCH_TAP_DISTANCE_THRESHOLD = 12;
const GESTURE_TAP_SUPPRESSION_MS = 240;

interface UseCanvasInteractionParams {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  cells: Cell[];
  gridX: number;
  gridY: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  worldOffsetX: number;
  worldOffsetY: number;
  onPan: (dx: number, dy: number) => void;
  onActivateCell: (cell: Cell, position: { x: number; y: number }) => void;
  onPinchZoom?: (payload: {
    centerClientX: number;
    centerClientY: number;
    scale: number;
  }) => void;
}

function isInsideCanvas(clientX: number, clientY: number, rect: DOMRect) {
  return (
    clientX >= rect.left &&
    clientX < rect.right &&
    clientY >= rect.top &&
    clientY < rect.bottom
  );
}

function getWorldCoordinate(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  cameraX: number,
  cameraY: number,
  zoom: number,
  worldOffsetX: number,
  worldOffsetY: number,
) {
  return {
    x: cameraX + (clientX - rect.left - worldOffsetX) / zoom,
    y: cameraY + (clientY - rect.top - worldOffsetY) / zoom,
  };
}

export function useCanvasInteraction({
  canvasRef,
  cells,
  gridX,
  gridY,
  cameraX,
  cameraY,
  zoom,
  worldOffsetX,
  worldOffsetY,
  onPan,
  onActivateCell,
  onPinchZoom,
}: UseCanvasInteractionParams) {
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const activeGestureRef = useRef<{
    pointerId: number;
    pointerType: string;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    hasPanned: boolean;
  } | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);
  const suppressTapUntilRef = useRef(0);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  const resetGesture = () => {
    activeGestureRef.current = null;
    pinchDistanceRef.current = null;
    setIsDraggingCanvas(false);
  };

  const beginSinglePointerGesture = (
    pointerId: number,
    pointerType: string,
    clientX: number,
    clientY: number,
  ) => {
    activeGestureRef.current = {
      pointerId,
      pointerType,
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastY: clientY,
      hasPanned: false,
    };
    pinchDistanceRef.current = null;
    setIsDraggingCanvas(false);
  };

  const getTrackedPointers = () => Array.from(activePointersRef.current.values()).slice(0, 2);

  const getTrackedDistance = () => {
    const [firstPointer, secondPointer] = getTrackedPointers();

    if (!firstPointer || !secondPointer) {
      return null;
    }

    return Math.hypot(
      secondPointer.x - firstPointer.x,
      secondPointer.y - firstPointer.y,
    );
  };

  const handlePointerDown = (event: ReactPointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore browsers that do not support explicit capture here.
    }

    if (activePointersRef.current.size === 1) {
      beginSinglePointerGesture(
        event.pointerId,
        event.pointerType,
        event.clientX,
        event.clientY,
      );
      return;
    }

    if (activePointersRef.current.size >= 2) {
      activeGestureRef.current = null;
      setIsDraggingCanvas(false);
      pinchDistanceRef.current = getTrackedDistance();
      suppressTapUntilRef.current = performance.now() + GESTURE_TAP_SUPPRESSION_MS;
    }
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    if (!activePointersRef.current.has(event.pointerId)) {
      return;
    }

    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (activePointersRef.current.size >= 2) {
      const [firstPointer, secondPointer] = getTrackedPointers();
      const nextDistance = getTrackedDistance();

      if (!firstPointer || !secondPointer || nextDistance === null) {
        return;
      }

      const previousDistance = pinchDistanceRef.current ?? nextDistance;

      if (
        onPinchZoom &&
        previousDistance > 0 &&
        nextDistance > 0 &&
        Math.abs(nextDistance - previousDistance) > 0.5
      ) {
        onPinchZoom({
          centerClientX: (firstPointer.x + secondPointer.x) / 2,
          centerClientY: (firstPointer.y + secondPointer.y) / 2,
          scale: nextDistance / previousDistance,
        });
      }

      pinchDistanceRef.current = nextDistance;
      setIsDraggingCanvas(false);
      return;
    }

    const activeGesture = activeGestureRef.current;

    if (!activeGesture || activeGesture.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - activeGesture.lastX;
    const dy = event.clientY - activeGesture.lastY;
    const totalDx = event.clientX - activeGesture.startX;
    const totalDy = event.clientY - activeGesture.startY;
    const tapDistanceThreshold =
      activeGesture.pointerType === "mouse"
        ? MOUSE_TAP_DISTANCE_THRESHOLD
        : TOUCH_TAP_DISTANCE_THRESHOLD;

    if (
      !activeGesture.hasPanned &&
      Math.hypot(totalDx, totalDy) > tapDistanceThreshold
    ) {
      activeGesture.hasPanned = true;
      setIsDraggingCanvas(true);
      suppressTapUntilRef.current = performance.now() + GESTURE_TAP_SUPPRESSION_MS;
    }

    if (activeGesture.hasPanned) {
      onPan(dx, dy);
    }

    activeGesture.lastX = event.clientX;
    activeGesture.lastY = event.clientY;
  };

  const handlePointerUp = (event: ReactPointerEvent) => {
    const hadPointer = activePointersRef.current.has(event.pointerId);
    const activeGesture = activeGestureRef.current;

    activePointersRef.current.delete(event.pointerId);

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore browsers that do not support explicit release here.
    }

    if (!hadPointer) {
      return;
    }

    if (activePointersRef.current.size >= 1) {
      if (activePointersRef.current.size === 1) {
        const [remainingPointerId, remainingPointer] =
          activePointersRef.current.entries().next().value ?? [];

        if (
          typeof remainingPointerId === "number" &&
          remainingPointer &&
          typeof remainingPointer.x === "number"
        ) {
          beginSinglePointerGesture(
            remainingPointerId,
            event.pointerType,
            remainingPointer.x,
            remainingPointer.y,
          );
        }
      }
      return;
    }

    resetGesture();

    if (!activeGesture || activeGesture.pointerId !== event.pointerId) {
      return;
    }

    if (activeGesture.hasPanned) {
      return;
    }

    if (performance.now() < suppressTapUntilRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || gridX === 0 || gridY === 0 || zoom <= 0) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (!isInsideCanvas(event.clientX, event.clientY, rect)) {
      return;
    }

    const cellSize = getGameConfig().board.cellSize;
    const worldPoint = getWorldCoordinate(
      event.clientX,
      event.clientY,
      rect,
      cameraX,
      cameraY,
      zoom,
      worldOffsetX,
      worldOffsetY,
    );

    const targetX = Math.floor(worldPoint.x / cellSize);
    const targetY = Math.floor(worldPoint.y / cellSize);

    if (targetX < 0 || targetX >= gridX || targetY < 0 || targetY >= gridY) {
      return;
    }

    const targetCell =
      cells.find((cell) => cell.x === targetX && cell.y === targetY) ??
      ({
        x: targetX,
        y: targetY,
        color: null,
        status: "idle",
      } as Cell);

    onActivateCell(targetCell, {
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handlePointerCancel = (event: ReactPointerEvent) => {
    activePointersRef.current.delete(event.pointerId);

    if (activePointersRef.current.size === 1) {
      const [remainingPointerId, remainingPointer] =
        activePointersRef.current.entries().next().value ?? [];

      if (
        typeof remainingPointerId === "number" &&
        remainingPointer &&
        typeof remainingPointer.x === "number"
      ) {
        beginSinglePointerGesture(
          remainingPointerId,
          event.pointerType,
          remainingPointer.x,
          remainingPointer.y,
        );
        return;
      }
    }

    resetGesture();
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    isDraggingCanvas,
  };
}
