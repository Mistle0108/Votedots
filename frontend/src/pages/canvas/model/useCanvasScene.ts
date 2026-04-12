import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Cell,
  useCanvasInteraction,
  useCanvasNavigation,
  useCanvasRenderer,
  useCanvasViewport,
} from "@/features/gameplay/canvas";
import type { CanvasBatchUpdatedPayload } from "@/features/gameplay/session/model/socket.types"; // 추가: batch canvas update payload
import { getGameConfig } from "@/shared/config/game-config";

interface UseCanvasSceneParams {
  previewColorRef: React.RefObject<string | null>;
  votingCellIdsRef: React.RefObject<Set<number>>;
  topColorMapRef: React.RefObject<Map<number, string>>;
  isRoundExpiredRef: React.RefObject<boolean>;
  resetPreviewColor: () => void;
  openPopup: (position: { x: number; y: number }) => void;
  closePopup: () => void;
}

interface ZoomBounds {
  minZoom: number;
  maxZoom: number;
}

interface PendingZoomAdjustment {
  contentX: number;
  contentY: number;
  viewportOffsetX: number;
  viewportOffsetY: number;
}

const ZOOM_STEP = 0.1;
const MAX_ZOOM = 4;

function getZoomBounds(
  container: HTMLDivElement,
  canvas: HTMLCanvasElement,
): ZoomBounds {
  if (canvas.width <= 0 || canvas.height <= 0) {
    return {
      minZoom: 1,
      maxZoom: MAX_ZOOM,
    };
  }

  const fitWidthZoom = container.clientWidth / canvas.width;
  const fitHeightZoom = container.clientHeight / canvas.height;
  const fittedZoom = Math.min(fitWidthZoom, fitHeightZoom);
  const minZoom =
    Number.isFinite(fittedZoom) && fittedZoom > 0 ? fittedZoom : 1;

  return {
    minZoom,
    maxZoom: Math.max(MAX_ZOOM, minZoom),
  };
}

function clampZoom(nextZoom: number, bounds: ZoomBounds) {
  return Math.min(bounds.maxZoom, Math.max(bounds.minZoom, nextZoom));
}

export default function useCanvasScene({
  previewColorRef,
  votingCellIdsRef,
  topColorMapRef,
  isRoundExpiredRef,
  resetPreviewColor,
  openPopup,
  closePopup,
}: UseCanvasSceneParams) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cellsRef = useRef<Cell[]>([]);
  const selectedCellRef = useRef<Cell | null>(null);
  const zoomRef = useRef(1);
  const initialZoomRef = useRef(1);
  const sceneKeyRef = useRef<string | null>(null);
  const pendingZoomAdjustmentRef = useRef<PendingZoomAdjustment | null>(null);

  const [cells, setCells] = useState<Cell[]>([]);
  const [canvasId, setCanvasId] = useState<number | null>(null);
  const [gridX, setGridX] = useState(0);
  const [gridY, setGridY] = useState(0);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    selectedCellRef.current = selectedCell;
  }, [selectedCell]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const updateCells = useCallback(
    (updater: Cell[] | ((prev: Cell[]) => Cell[])) => {
      if (typeof updater === "function") {
        setCells((prev) => {
          const next = updater(prev);
          cellsRef.current = next;
          return next;
        });
      } else {
        cellsRef.current = updater;
        setCells(updater);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasId || gridX === 0 || gridY === 0) {
      if (canvasReady) {
        setCanvasReady(false);
      }
      return;
    }

    const cellSize = getGameConfig().board.cellSize;

    canvas.width = gridX * cellSize;
    canvas.height = gridY * cellSize;
    canvas.style.width = `${canvas.width * zoom}px`;
    canvas.style.height = `${canvas.height * zoom}px`;

    const sceneKey = `${canvasId}:${gridX}:${gridY}`;
    if (sceneKeyRef.current !== sceneKey) {
      sceneKeyRef.current = sceneKey;
      initialZoomRef.current = zoom;
    }

    if (!canvasReady) {
      setCanvasReady(true);
    }
  }, [canvasId, gridX, gridY, zoom, canvasReady]);

  const { viewport, updateViewport } = useCanvasViewport({
    containerRef,
    canvasRef,
    gridX,
    gridY,
    canvasReady,
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const pending = pendingZoomAdjustmentRef.current;

    if (!container || !canvas || !canvasReady || !pending) {
      return;
    }

    const nextScrollLeft =
      canvas.offsetLeft + pending.contentX * zoom - pending.viewportOffsetX;
    const nextScrollTop =
      canvas.offsetTop + pending.contentY * zoom - pending.viewportOffsetY;

    const maxScrollLeft = Math.max(
      0,
      container.scrollWidth - container.clientWidth,
    );
    const maxScrollTop = Math.max(
      0,
      container.scrollHeight - container.clientHeight,
    );

    container.scrollTo({
      left: Math.min(Math.max(0, nextScrollLeft), maxScrollLeft),
      top: Math.min(Math.max(0, nextScrollTop), maxScrollTop),
      behavior: "auto",
    });

    pendingZoomAdjustmentRef.current = null;
    updateViewport();
  }, [zoom, canvasReady, updateViewport]);

  const { navigateToCoordinate } = useCanvasNavigation({
    containerRef,
    canvasRef,
    gridX,
    gridY,
    updateViewport,
  });

  useCanvasRenderer({
    canvasRef,
    canvasReady,
    cellsRef,
    selectedCellRef,
    previewColorRef,
    votingCellIdsRef,
    topColorMapRef,
  });

  const handleSelectCell = useCallback((cell: Cell) => {
    setSelectedCell(cell);
    selectedCellRef.current = cell;
  }, []);

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } =
    useCanvasInteraction({
      containerRef,
      canvasRef,
      cells,
      gridX,
      gridY,
      onSelectCell: handleSelectCell,
      onResetPreviewColor: resetPreviewColor,
      onOpenPopup: openPopup,
    });

  const resetCanvasZoom = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas || !canvasReady) {
      return;
    }

    const bounds = getZoomBounds(container, canvas);

    setZoom((currentZoom) => {
      const nextZoom = clampZoom(initialZoomRef.current, bounds);

      if (nextZoom === currentZoom) {
        return currentZoom;
      }

      pendingZoomAdjustmentRef.current = {
        contentX:
          (container.scrollLeft +
            container.clientWidth / 2 -
            canvas.offsetLeft) /
          currentZoom,
        contentY:
          (container.scrollTop +
            container.clientHeight / 2 -
            canvas.offsetTop) /
          currentZoom,
        viewportOffsetX: container.clientWidth / 2,
        viewportOffsetY: container.clientHeight / 2,
      };

      zoomRef.current = nextZoom;
      return nextZoom;
    });
  }, [canvasReady]);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      const container = containerRef.current;
      const canvas = canvasRef.current;

      if (!container || !canvas || !canvasReady) {
        return;
      }

      event.preventDefault();

      const containerRect = container.getBoundingClientRect();
      const pointerOffsetX = event.clientX - containerRect.left;
      const pointerOffsetY = event.clientY - containerRect.top;
      const zoomDelta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      const bounds = getZoomBounds(container, canvas);

      setZoom((currentZoom) => {
        const nextZoom = clampZoom(currentZoom + zoomDelta, bounds);

        if (nextZoom === currentZoom) {
          return currentZoom;
        }

        pendingZoomAdjustmentRef.current = {
          contentX:
            (container.scrollLeft + pointerOffsetX - canvas.offsetLeft) /
            currentZoom,
          contentY:
            (container.scrollTop + pointerOffsetY - canvas.offsetTop) /
            currentZoom,
          viewportOffsetX: pointerOffsetX,
          viewportOffsetY: pointerOffsetY,
        };

        zoomRef.current = nextZoom;
        return nextZoom;
      });
    },
    [canvasReady],
  );

  const handleCanvasUpdated = useCallback(
    ({ cellId, color }: { cellId: number; color: string }) => {
      updateCells((prev) =>
        prev.map((cell) =>
          cell.id === cellId ? { ...cell, color, status: "painted" } : cell,
        ),
      );

      if (selectedCellRef.current?.id === cellId) {
        const nextSelectedCell: Cell = {
          ...selectedCellRef.current,
          color,
          status: "painted",
        };

        setSelectedCell(nextSelectedCell);
        selectedCellRef.current = nextSelectedCell;

        if (!isRoundExpiredRef.current) {
          closePopup();
        }
      }
    },
    [closePopup, isRoundExpiredRef, updateCells],
  );

  const handleCanvasBatchUpdated = useCallback(
    ({ updates }: CanvasBatchUpdatedPayload) => {
      if (updates.length === 0) {
        return;
      }

      const updateMap = new Map(
        updates.map((update) => [update.cellId, update]),
      ); // 추가: 셀 id 기준으로 batch update lookup 생성

      updateCells((prev) =>
        prev.map((cell) => {
          const nextUpdate = updateMap.get(cell.id);

          if (!nextUpdate) {
            return cell;
          }

          return {
            ...cell,
            color: nextUpdate.color,
            status: "painted",
          };
        }),
      );

      if (selectedCellRef.current) {
        const selectedUpdate = updateMap.get(selectedCellRef.current.id);

        if (selectedUpdate) {
          const nextSelectedCell: Cell = {
            ...selectedCellRef.current,
            color: selectedUpdate.color,
            status: "painted",
          };

          setSelectedCell(nextSelectedCell);
          selectedCellRef.current = nextSelectedCell;

          if (!isRoundExpiredRef.current) {
            closePopup();
          }
        }
      }
    },
    [closePopup, isRoundExpiredRef, updateCells],
  );

  const clearSelectedCell = useCallback(() => {
    setSelectedCell(null);
    selectedCellRef.current = null;
  }, []);

  return {
    canvasRef,
    containerRef,
    cells,
    canvasId,
    gridX,
    gridY,
    selectedCell,
    viewport,
    navigateToCoordinate,
    resetCanvasZoom,
    setCanvasId,
    setGridX,
    setGridY,
    updateCells,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleWheel, // 추가: CanvasPage에서 사용하는 wheel zoom 핸들러 반환
    handleCanvasUpdated,
    handleCanvasBatchUpdated, // 유지: 여러 셀을 한 번에 반영하는 batch handler 노출
    clearSelectedCell,
  };
}
