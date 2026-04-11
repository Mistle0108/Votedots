import { useRef, type RefObject } from "react";
import { Cell } from "../model/canvas.types";

interface UseCanvasInteractionParams {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  cells: Cell[];
  gridX: number;
  gridY: number;
  onSelectCell: (cell: Cell) => void;
  onResetPreviewColor: () => void;
  onOpenPopup: (position: { x: number; y: number }) => void;
}

export function useCanvasInteraction({
  containerRef,
  canvasRef,
  cells,
  gridX,
  gridY,
  onSelectCell,
  onResetPreviewColor,
  onOpenPopup,
}: UseCanvasInteractionParams) {
  const isPanning = useRef(false);
  const hasPanned = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return;

    isPanning.current = true;
    hasPanned.current = false;
    lastPos.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isPanning.current) return;

    const container = containerRef.current;
    if (!container) return;

    const dx = event.clientX - lastPos.current.x;
    const dy = event.clientY - lastPos.current.y;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      hasPanned.current = true;
    }

    container.scrollLeft -= dx;
    container.scrollTop -= dy;
    lastPos.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    if (event.button !== 0) return;

    isPanning.current = false;

    if (hasPanned.current) return;

    const canvas = canvasRef.current;
    if (!canvas || gridX === 0 || gridY === 0) return;

    const rect = canvas.getBoundingClientRect();
    const cellWidth = rect.width / gridX;
    const cellHeight = rect.height / gridY;

    const x = Math.floor((event.clientX - rect.left) / cellWidth);
    const y = Math.floor((event.clientY - rect.top) / cellHeight);

    const cell = cells.find(
      (candidate) => candidate.x === x && candidate.y === y,
    );

    if (!cell || cell.status === "locked") return;

    onSelectCell(cell);
    onResetPreviewColor();
    onOpenPopup({
      x: rect.left + (cell.x + 2) * cellWidth,
      y: rect.top + (cell.y - 1.5) * cellHeight,
    });
  };

  const handleMouseLeave = () => {
    isPanning.current = false;
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  };
}
