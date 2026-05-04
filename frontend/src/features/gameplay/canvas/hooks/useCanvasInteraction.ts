import { useRef, useState, type RefObject } from "react";
import { getGameConfig } from "@/shared/config/game-config";
import { Cell } from "../model/canvas.types";

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
}: UseCanvasInteractionParams) {
  const isPanning = useRef(false);
  const hasPanned = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return;

    isPanning.current = true;
    hasPanned.current = false;
    setIsDraggingCanvas(false);
    lastPos.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isPanning.current) return;

    const dx = event.clientX - lastPos.current.x;
    const dy = event.clientY - lastPos.current.y;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      hasPanned.current = true;
      setIsDraggingCanvas(true);
    }

    onPan(dx, dy);
    lastPos.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    if (event.button !== 0) return;

    const wasPanning = isPanning.current;
    isPanning.current = false;
    setIsDraggingCanvas(false);

    if (!wasPanning) {
      hasPanned.current = false;
      return;
    }

    if (hasPanned.current) {
      hasPanned.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || gridX === 0 || gridY === 0 || zoom <= 0) {
      hasPanned.current = false;
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (!isInsideCanvas(event.clientX, event.clientY, rect)) {
      hasPanned.current = false;
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
      hasPanned.current = false;
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

    hasPanned.current = false;
    onActivateCell(targetCell, {
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleMouseLeave = () => {
    isPanning.current = false;
    setIsDraggingCanvas(false);
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    isDraggingCanvas,
  };
}
