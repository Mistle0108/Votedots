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
  previewColor: string | null;
  votingCellIds: Set<string>;
  topColorMap: Map<string, string>;
  resetPreviewColor: () => void;
  openPopup: (position: { x: number; y: number }) => void;
}

interface ZoomBounds {
  minZoom: number;
  maxZoom: number;
}

interface PendingZoomAdjustment {
  focusWorldX: number;
  focusWorldY: number;
  viewportOffsetX: number;
  viewportOffsetY: number;
}

function getWorldSize(gridX: number, gridY: number) {
  const cellSize = getGameConfig().board.cellSize;

  return {
    cellSize,
    worldWidth: gridX * cellSize,
    worldHeight: gridY * cellSize,
  };
}

const ZOOM_SCALE = 1.1;
const MAX_ZOOM = 4;

function getZoomBounds(
  container: HTMLDivElement,
  worldWidth: number,
  worldHeight: number,
): ZoomBounds {
  if (worldWidth <= 0 || worldHeight <= 0) {
    return {
      minZoom: 1,
      maxZoom: MAX_ZOOM,
    };
  }

  const fitWidthZoom = container.clientWidth / worldWidth;
  const fitHeightZoom = container.clientHeight / worldHeight;
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

function getNextZoom(
  currentZoom: number,
  zoomIn: boolean,
  bounds: ZoomBounds,
) {
  const scaledZoom = zoomIn ? currentZoom * ZOOM_SCALE : currentZoom / ZOOM_SCALE;
  return clampZoom(scaledZoom, bounds);
}

function clampCamera(
  nextCameraX: number,
  nextCameraY: number,
  worldWidth: number,
  worldHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
) {
  const maxCameraX = Math.max(0, worldWidth - viewportWidth / zoom);
  const maxCameraY = Math.max(0, worldHeight - viewportHeight / zoom);

  return {
    x: Math.min(Math.max(0, nextCameraX), maxCameraX),
    y: Math.min(Math.max(0, nextCameraY), maxCameraY),
  };
}

export default function useCanvasScene({
  previewColor,
  votingCellIds,
  topColorMap,
  resetPreviewColor,
  openPopup,
}: UseCanvasSceneParams) {
  const paintCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cellsRef = useRef<Cell[]>([]);
  const selectedCellRef = useRef<Cell | null>(null);
  const zoomRef = useRef(1);
  const cameraXRef = useRef(0);
  const cameraYRef = useRef(0);
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
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    selectedCellRef.current = selectedCell;
  }, [selectedCell]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    cameraXRef.current = cameraX;
  }, [cameraX]);

  useEffect(() => {
    cameraYRef.current = cameraY;
  }, [cameraY]);

  useEffect(() => {
    let frameId = 0;
    let observer: ResizeObserver | null = null;

    const bindViewportSize = () => {
      const container = containerRef.current;

      if (!container) {
        frameId = requestAnimationFrame(bindViewportSize);
        return;
      }

      const syncViewportSize = () => {
        const nextWidth = container.clientWidth;
        const nextHeight = container.clientHeight;

        setViewportSize((prev) => {
          if (prev.width === nextWidth && prev.height === nextHeight) {
            return prev;
          }

          return {
            width: nextWidth,
            height: nextHeight,
          };
        });
      };

      syncViewportSize();

      observer = new ResizeObserver(() => {
        syncViewportSize();
      });

      observer.observe(container);
    };

    bindViewportSize();

    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, []);

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
    const container = containerRef.current;
    const paintCanvas = paintCanvasRef.current;
    const canvas = canvasRef.current;

    if (
      !container ||
      !paintCanvas ||
      !canvas ||
      !canvasId ||
      gridX === 0 ||
      gridY === 0
    ) {
      if (canvasReady) {
        setCanvasReady(false);
      }
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const viewportWidth = viewportSize.width;
    const viewportHeight = viewportSize.height;

    if (viewportWidth <= 0 || viewportHeight <= 0) {
      if (canvasReady) {
        setCanvasReady(false);
      }
      return;
    }

    for (const target of [paintCanvas, canvas]) {
      target.width = Math.floor(viewportWidth * dpr);
      target.height = Math.floor(viewportHeight * dpr);
      target.style.width = `${viewportWidth}px`;
      target.style.height = `${viewportHeight}px`;

      const ctx = target.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const sceneKey = `${canvasId}:${gridX}:${gridY}`;
    if (sceneKeyRef.current !== sceneKey) {
      const { worldWidth, worldHeight } = getWorldSize(gridX, gridY);
      const bounds = getZoomBounds(container, worldWidth, worldHeight);

      sceneKeyRef.current = sceneKey;
      initialZoomRef.current = bounds.minZoom;
      setZoom(bounds.minZoom);
      setCameraX(0);
      setCameraY(0);
    }

    if (!canvasReady) {
      setCanvasReady(true);
    }
  }, [
    canvasId,
    gridX,
    gridY,
    canvasReady,
    viewportSize.width,
    viewportSize.height,
  ]);

  const { viewport, visibleCellBounds } = useCanvasViewport({
    containerRef,
    gridX,
    gridY,
    canvasReady,
    cameraX,
    cameraY,
    zoom,
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const pending = pendingZoomAdjustmentRef.current;

    if (!container || !canvasReady || !pending || gridX === 0 || gridY === 0) {
      return;
    }

    const { worldWidth, worldHeight } = getWorldSize(gridX, gridY);
    const nextCamera = clampCamera(
      pending.focusWorldX - pending.viewportOffsetX / zoom,
      pending.focusWorldY - pending.viewportOffsetY / zoom,
      worldWidth,
      worldHeight,
      container.clientWidth,
      container.clientHeight,
      zoom,
    );

    setCameraX(nextCamera.x);
    setCameraY(nextCamera.y);
    pendingZoomAdjustmentRef.current = null;
  }, [zoom, canvasReady, gridX, gridY]);

  const { navigateToCoordinate } = useCanvasNavigation({
    containerRef,
    gridX,
    gridY,
    zoom,
    setCameraX,
    setCameraY,
  });

  useCanvasRenderer({
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
  });

  const handleSelectCell = useCallback((cell: Cell) => {
    setSelectedCell(cell);
    selectedCellRef.current = cell;
  }, []);

  const handlePan = useCallback(
    (dx: number, dy: number) => {
      const container = containerRef.current;
      if (!container || gridX === 0 || gridY === 0) {
        return;
      }

      const { worldWidth, worldHeight } = getWorldSize(gridX, gridY);
      const nextCamera = clampCamera(
        cameraXRef.current - dx / zoomRef.current,
        cameraYRef.current - dy / zoomRef.current,
        worldWidth,
        worldHeight,
        container.clientWidth,
        container.clientHeight,
        zoomRef.current,
      );

      setCameraX(nextCamera.x);
      setCameraY(nextCamera.y);
    },
    [gridX, gridY],
  );

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } =
    useCanvasInteraction({
      canvasRef,
      cells,
      gridX,
      gridY,
      cameraX,
      cameraY,
      zoom,
      onPan: handlePan,
      onSelectCell: handleSelectCell,
      onResetPreviewColor: resetPreviewColor,
      onOpenPopup: openPopup,
    });

  const resetCanvasZoom = useCallback(() => {
    const container = containerRef.current;

    if (!container || !canvasReady || gridX === 0 || gridY === 0) {
      return;
    }

    const { worldWidth, worldHeight } = getWorldSize(gridX, gridY);
    const bounds = getZoomBounds(container, worldWidth, worldHeight);

    setZoom((currentZoom) => {
      const nextZoom = clampZoom(initialZoomRef.current, bounds);

      if (nextZoom === currentZoom) {
        return currentZoom;
      }

      pendingZoomAdjustmentRef.current = {
        focusWorldX:
          cameraXRef.current + container.clientWidth / 2 / currentZoom,
        focusWorldY:
          cameraYRef.current + container.clientHeight / 2 / currentZoom,
        viewportOffsetX: container.clientWidth / 2,
        viewportOffsetY: container.clientHeight / 2,
      };

      zoomRef.current = nextZoom;
      return nextZoom;
    });
  }, [canvasReady, gridX, gridY]);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      const container = containerRef.current;

      if (!container || !canvasReady || gridX === 0 || gridY === 0) {
        return;
      }

      event.preventDefault();

      const containerRect = container.getBoundingClientRect();
      const pointerOffsetX = event.clientX - containerRect.left;
      const pointerOffsetY = event.clientY - containerRect.top;
      const zoomIn = event.deltaY < 0;

      const { worldWidth, worldHeight } = getWorldSize(gridX, gridY);
      const bounds = getZoomBounds(container, worldWidth, worldHeight);

      setZoom((currentZoom) => {
        const nextZoom = getNextZoom(currentZoom, zoomIn, bounds);

        if (nextZoom === currentZoom) {
          return currentZoom;
        }

        pendingZoomAdjustmentRef.current = {
          focusWorldX: cameraXRef.current + pointerOffsetX / currentZoom,
          focusWorldY: cameraYRef.current + pointerOffsetY / currentZoom,
          viewportOffsetX: pointerOffsetX,
          viewportOffsetY: pointerOffsetY,
        };

        zoomRef.current = nextZoom;
        return nextZoom;
      });
    },
    [canvasReady, gridX, gridY],
  );

  const handleCanvasUpdated = useCallback(
    ({ x, y, color }: { x: number; y: number; color: string }) => {
      updateCells((prev) => {
        const index = prev.findIndex((cell) => cell.x === x && cell.y === y);

        if (index === -1) {
          return [
            ...prev,
            {
              x,
              y,
              color,
              status: "painted",
            } as Cell,
          ];
        }

        return prev.map((cell) =>
          cell.x === x && cell.y === y
            ? { ...cell, color, status: "painted" }
            : cell,
        );
      });

      if (
        selectedCellRef.current &&
        selectedCellRef.current.x === x &&
        selectedCellRef.current.y === y
      ) {
        const nextSelectedCell: Cell = {
          ...selectedCellRef.current,
          color,
          status: "painted",
        };

        setSelectedCell(nextSelectedCell);
        selectedCellRef.current = nextSelectedCell;
      }
    },
    [updateCells],
  );

  const handleCanvasBatchUpdated = useCallback(
    ({ updates }: CanvasBatchUpdatedPayload) => {
      const colorByCoordinate = new Map(
        updates.map((update) => [`${update.x}:${update.y}`, update.color]),
      );

      updateCells((prev) => {
        const next = [...prev];

        for (const update of updates) {
          const index = next.findIndex(
            (cell) => cell.x === update.x && cell.y === update.y,
          );

          if (index === -1) {
            next.push({
              x: update.x,
              y: update.y,
              color: update.color,
              status: "painted",
            } as Cell);
            continue;
          }

          next[index] = {
            ...next[index],
            color: update.color,
            status: "painted",
          };
        }

        return next;
      });

      if (selectedCellRef.current) {
        const selectedKey = `${selectedCellRef.current.x}:${selectedCellRef.current.y}`;

        if (colorByCoordinate.has(selectedKey)) {
          const nextSelectedCell: Cell = {
            ...selectedCellRef.current,
            color: colorByCoordinate.get(selectedKey)!,
            status: "painted",
          };

          setSelectedCell(nextSelectedCell);
          selectedCellRef.current = nextSelectedCell;
        }
      }
    },
    [updateCells],
  );

  const clearSelectedCell = useCallback(() => {
    setSelectedCell(null);
    selectedCellRef.current = null;
  }, []);

  return {
    paintCanvasRef,
    canvasRef,
    containerRef,
    cells,
    canvasId,
    gridX,
    gridY,
    selectedCell,
    viewport,
    cameraX,
    cameraY,
    zoom,
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
