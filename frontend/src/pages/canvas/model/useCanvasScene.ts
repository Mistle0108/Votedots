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
import { calculateWorldScreenOffset } from "@/features/gameplay/canvas/model/viewport";
import type { CanvasBatchUpdatedPayload } from "@/features/gameplay/session/model/socket.types";
import { getGameConfig } from "@/shared/config/game-config";
import socket from "@/shared/lib/socket";

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
const MAX_ZOOM_MULTIPLIER = 4;

const INITIAL_VIEWPORT_GRID_DIVISIONS = 3;
const ZOOMED_ENTRY_GRID_THRESHOLD = 128;

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
    maxZoom: Math.max(MAX_ZOOM, minZoom * MAX_ZOOM_MULTIPLIER),
  };
}

function clampZoom(nextZoom: number, bounds: ZoomBounds) {
  return Math.min(bounds.maxZoom, Math.max(bounds.minZoom, nextZoom));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getNextZoom(currentZoom: number, zoomIn: boolean, bounds: ZoomBounds) {
  const scaledZoom = zoomIn
    ? currentZoom * ZOOM_SCALE
    : currentZoom / ZOOM_SCALE;
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

function isCellInsideVisibleBounds(
  x: number,
  y: number,
  bounds: {
    startCellX: number;
    endCellX: number;
    startCellY: number;
    endCellY: number;
  } | null,
) {
  if (!bounds) {
    return false;
  }

  return (
    x >= bounds.startCellX &&
    x <= bounds.endCellX &&
    y >= bounds.startCellY &&
    y <= bounds.endCellY
  );
}

function isTextInputElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;

  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}

function upsertCells(
  prev: Cell[],
  updates: Array<{ x: number; y: number; color: string }>,
) {
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
}

export default function useCanvasScene({
  previewColor,
  votingCellIds,
  topColorMap,
  resetPreviewColor,
  openPopup,
}: UseCanvasSceneParams) {
  const containerRef = useRef<HTMLDivElement>(null);

  const paintCanvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasNodeVersion, setCanvasNodeVersion] = useState(0);

  const paintCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    if (paintCanvasElementRef.current === node) {
      return;
    }

    paintCanvasElementRef.current = node;
    setCanvasNodeVersion((prev) => prev + 1);
  }, []);

  const canvasRef = useCallback((node: HTMLCanvasElement | null) => {
    if (canvasElementRef.current === node) {
      return;
    }

    canvasElementRef.current = node;
    setCanvasNodeVersion((prev) => prev + 1);
  }, []);

  const selectedCellRef = useRef<Cell | null>(null);
  const canvasIdRef = useRef<number | null>(null);
  const zoomRef = useRef(1);
  const cameraXRef = useRef(0);
  const cameraYRef = useRef(0);
  const initialZoomRef = useRef(1);
  const initialCameraXRef = useRef(0);
  const initialCameraYRef = useRef(0);
  const sceneKeyRef = useRef<string | null>(null);
  const pendingZoomAdjustmentRef = useRef<PendingZoomAdjustment | null>(null);

  const [cells, setCells] = useState<Cell[]>([]);
  const [minimapCells, setMinimapCells] = useState<Cell[]>([]);
  const [canvasId, setCanvasId] = useState<number | null>(null);
  const [gridX, setGridX] = useState(0);
  const [gridY, setGridY] = useState(0);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [selectionVisible, setSelectionVisible] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    selectedCellRef.current = selectedCell;
  }, [selectedCell]);

  useEffect(() => {
    canvasIdRef.current = canvasId;
  }, [canvasId]);

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

        if (nextWidth <= 0 || nextHeight <= 0) {
          frameId = requestAnimationFrame(syncViewportSize);
          return;
        }

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
      frameId = requestAnimationFrame(syncViewportSize);

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
        setCells((prev) => updater(prev));
        return;
      }

      setCells(updater);
    },
    [],
  );

  const updateMinimapCells = useCallback(
    (updater: Cell[] | ((prev: Cell[]) => Cell[])) => {
      if (typeof updater === "function") {
        setMinimapCells((prev) => updater(prev));
        return;
      }

      setMinimapCells(updater);
    },
    [],
  );

  useLayoutEffect(() => {
    const scheduleStateUpdate = (callback: () => void) => {
      queueMicrotask(callback);
    };
    const container = containerRef.current;
    const paintCanvas = paintCanvasElementRef.current;
    const canvas = canvasElementRef.current;
    if (
      !container ||
      !paintCanvas ||
      !canvas ||
      !canvasId ||
      gridX === 0 ||
      gridY === 0
    ) {
      if (!canvasId || gridX === 0 || gridY === 0) {
        sceneKeyRef.current = null;
        pendingZoomAdjustmentRef.current = null;
        initialZoomRef.current = 1;
        initialCameraXRef.current = 0;
        initialCameraYRef.current = 0;
        zoomRef.current = 1;
        cameraXRef.current = 0;
        cameraYRef.current = 0;
        selectedCellRef.current = null;
        scheduleStateUpdate(() => {
          setCanvasReady(false);
          setSelectedCell(null);
          setSelectionVisible(false);
        });
      } else if (canvasReady) {
        scheduleStateUpdate(() => {
          setCanvasReady(false);
        });
      }

      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const viewportWidth = viewportSize.width;
    const viewportHeight = viewportSize.height;

    if (viewportWidth <= 0 || viewportHeight <= 0) {
      if (canvasReady) {
        scheduleStateUpdate(() => {
          setCanvasReady(false);
        });
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
      const largestGridSize = Math.max(gridX, gridY);
      const initialZoom =
        largestGridSize >= ZOOMED_ENTRY_GRID_THRESHOLD
          ? clampZoom(bounds.minZoom * INITIAL_VIEWPORT_GRID_DIVISIONS, bounds)
          : bounds.minZoom;
      const initialCamera = clampCamera(
        (worldWidth - viewportWidth / initialZoom) / 2,
        (worldHeight - viewportHeight / initialZoom) / 2,
        worldWidth,
        worldHeight,
        viewportWidth,
        viewportHeight,
        initialZoom,
      );

      sceneKeyRef.current = sceneKey;
      pendingZoomAdjustmentRef.current = null;
      initialZoomRef.current = initialZoom;
      initialCameraXRef.current = initialCamera.x;
      initialCameraYRef.current = initialCamera.y;
      zoomRef.current = initialZoom;
      cameraXRef.current = initialCamera.x;
      cameraYRef.current = initialCamera.y;
      selectedCellRef.current = null;
      scheduleStateUpdate(() => {
        setZoom(initialZoom);
        setCameraX(initialCamera.x);
        setCameraY(initialCamera.y);
        setSelectedCell(null);
        setSelectionVisible(false);
      });
    }

    if (!canvasReady) {
      scheduleStateUpdate(() => {
        setCanvasReady(true);
      });
    }
  }, [
    canvasId,
    gridX,
    gridY,
    canvasReady,
    canvasNodeVersion,
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

  const { worldWidth, worldHeight } = getWorldSize(gridX, gridY);
  const worldOffset = calculateWorldScreenOffset({
    worldWidth,
    worldHeight,
    viewportWidth: viewportSize.width,
    viewportHeight: viewportSize.height,
    zoom,
  });

  const buildCellAtCoordinate = useCallback(
    (x: number, y: number): Cell =>
      cells.find((cell) => cell.x === x && cell.y === y) ??
      ({
        x,
        y,
        color: null,
        status: "idle",
      } as Cell),
    [cells],
  );

  const centerCameraOnCell = useCallback(
    (x: number, y: number) => {
      const container = containerRef.current;

      if (!container || gridX === 0 || gridY === 0 || zoomRef.current <= 0) {
        return null;
      }

      const cellSize = getGameConfig().board.cellSize;
      const viewportWorldWidth = container.clientWidth / zoomRef.current;
      const viewportWorldHeight = container.clientHeight / zoomRef.current;
      const targetWorldCenterX = x * cellSize + cellSize / 2;
      const targetWorldCenterY = y * cellSize + cellSize / 2;

      return {
        x: clamp(
          targetWorldCenterX - viewportWorldWidth / 2,
          0,
          Math.max(0, worldWidth - viewportWorldWidth),
        ),
        y: clamp(
          targetWorldCenterY - viewportWorldHeight / 2,
          0,
          Math.max(0, worldHeight - viewportWorldHeight),
        ),
      };
    },
    [gridX, gridY, worldHeight, worldWidth],
  );

  const getPopupPositionForCell = useCallback(
    (
      x: number,
      y: number,
      cameraOverride?: { x: number; y: number } | null,
    ): { x: number; y: number } | null => {
      const container = containerRef.current;

      if (!container || zoomRef.current <= 0) {
        return null;
      }

      const rect = container.getBoundingClientRect();
      const cellSize = getGameConfig().board.cellSize;
      const resolvedCamera = cameraOverride ?? {
        x: cameraXRef.current,
        y: cameraYRef.current,
      };

      return {
        x:
          rect.left +
          worldOffset.x -
          resolvedCamera.x * zoomRef.current +
          (x + 0.5) * cellSize * zoomRef.current,
        y:
          rect.top +
          worldOffset.y -
          resolvedCamera.y * zoomRef.current +
          (y + 0.5) * cellSize * zoomRef.current,
      };
    },
    [worldOffset.x, worldOffset.y],
  );

  const emitSelectionUpdate = useCallback(
    (nextSelectedCell: Pick<Cell, "x" | "y"> | null) => {
      const activeCanvasId = canvasIdRef.current;

      if (!socket.connected || !activeCanvasId) {
        return;
      }

      socket.emit("selection:update", {
        canvasId: activeCanvasId,
        x: nextSelectedCell?.x ?? null,
        y: nextSelectedCell?.y ?? null,
      });
    },
    [],
  );

  const activateCell = useCallback(
    (cell: Cell, position?: { x: number; y: number }) => {
      resetPreviewColor();
      setSelectedCell(cell);
      selectedCellRef.current = cell;
      setSelectionVisible(true);
      emitSelectionUpdate(cell);
      openPopup(position ?? getPopupPositionForCell(cell.x, cell.y) ?? { x: 0, y: 0 });
    },
    [emitSelectionUpdate, getPopupPositionForCell, openPopup, resetPreviewColor],
  );

  const activateCellAtCoordinate = useCallback(
    (x: number, y: number) => {
      if (x < 0 || x >= gridX || y < 0 || y >= gridY) {
        return;
      }

      const nextCell = buildCellAtCoordinate(x, y);
      const shouldCenterCamera = !isCellInsideVisibleBounds(
        x,
        y,
        visibleCellBounds,
      );
      const nextCamera = shouldCenterCamera ? centerCameraOnCell(x, y) : null;

      if (nextCamera) {
        setCameraX(nextCamera.x);
        setCameraY(nextCamera.y);
        cameraXRef.current = nextCamera.x;
        cameraYRef.current = nextCamera.y;
      }

      activateCell(
        nextCell,
        getPopupPositionForCell(x, y, nextCamera) ?? undefined,
      );
    },
    [
      activateCell,
      buildCellAtCoordinate,
      centerCameraOnCell,
      getPopupPositionForCell,
      gridX,
      gridY,
      visibleCellBounds,
    ],
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    const pending = pendingZoomAdjustmentRef.current;

    if (!container || !canvasReady || !pending || gridX === 0 || gridY === 0) {
      return;
    }

    const { worldWidth, worldHeight } = getWorldSize(gridX, gridY);
    const nextWorldOffset = calculateWorldScreenOffset({
      worldWidth,
      worldHeight,
      viewportWidth: container.clientWidth,
      viewportHeight: container.clientHeight,
      zoom,
    });
    const nextCamera = clampCamera(
      pending.focusWorldX -
        (pending.viewportOffsetX - nextWorldOffset.x) / zoom,
      pending.focusWorldY -
        (pending.viewportOffsetY - nextWorldOffset.y) / zoom,
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
    paintCanvasRef: paintCanvasElementRef,
    canvasRef: canvasElementRef,
    canvasReady,
    cells,
    selectedCell: selectionVisible ? selectedCell : null,
    previewColor,
    votingCellIds,
    topColorMap,
    visibleCellBounds,
    cameraX,
    cameraY,
    zoom,
    worldOffsetX: worldOffset.x,
    worldOffsetY: worldOffset.y,
  });

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

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    isDraggingCanvas,
  } = useCanvasInteraction({
    canvasRef: canvasElementRef,
    cells,
    gridX,
    gridY,
    cameraX,
    cameraY,
    zoom,
    worldOffsetX: worldOffset.x,
    worldOffsetY: worldOffset.y,
    onPan: handlePan,
    onActivateCell: activateCell,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isTextInputElement(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      let deltaX = 0;
      let deltaY = 0;

      switch (key) {
        case "arrowup":
        case "w":
          deltaY = -1;
          break;
        case "arrowdown":
        case "s":
          deltaY = 1;
          break;
        case "arrowleft":
        case "a":
          deltaX = -1;
          break;
        case "arrowright":
        case "d":
          deltaX = 1;
          break;
        default:
          return;
      }

      event.preventDefault();

      const currentCell = selectedCellRef.current;

      if (!currentCell) {
        return;
      }

      const nextX = currentCell.x + deltaX;
      const nextY = currentCell.y + deltaY;

      if (nextX < 0 || nextX >= gridX || nextY < 0 || nextY >= gridY) {
        return;
      }

      activateCellAtCoordinate(nextX, nextY);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activateCellAtCoordinate, gridX, gridY]);

  const resetCanvasZoom = useCallback(() => {
    const container = containerRef.current;

    if (!container || !canvasReady || gridX === 0 || gridY === 0) {
      return;
    }

    const { worldWidth, worldHeight } = getWorldSize(gridX, gridY);
    const bounds = getZoomBounds(container, worldWidth, worldHeight);
    const nextZoom = clampZoom(initialZoomRef.current, bounds);
    const nextCamera = clampCamera(
      initialCameraXRef.current,
      initialCameraYRef.current,
      worldWidth,
      worldHeight,
      container.clientWidth,
      container.clientHeight,
      nextZoom,
    );

    pendingZoomAdjustmentRef.current = null;
    zoomRef.current = nextZoom;
    cameraXRef.current = nextCamera.x;
    cameraYRef.current = nextCamera.y;
    setZoom(nextZoom);
    setCameraX(nextCamera.x);
    setCameraY(nextCamera.y);
  }, [canvasReady, gridX, gridY]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
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

        const currentWorldOffset = calculateWorldScreenOffset({
          worldWidth,
          worldHeight,
          viewportWidth: container.clientWidth,
          viewportHeight: container.clientHeight,
          zoom: currentZoom,
        });

        pendingZoomAdjustmentRef.current = {
          focusWorldX:
            cameraXRef.current +
            (pointerOffsetX - currentWorldOffset.x) / currentZoom,
          focusWorldY:
            cameraYRef.current +
            (pointerOffsetY - currentWorldOffset.y) / currentZoom,
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
      updateCells((prev) =>
        upsertCells(prev, [
          {
            x,
            y,
            color,
          },
        ]),
      );

      updateMinimapCells((prev) =>
        upsertCells(prev, [
          {
            x,
            y,
            color,
          },
        ]),
      );

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
    [updateCells, updateMinimapCells],
  );

  const handleCanvasBatchUpdated = useCallback(
    ({ updates }: CanvasBatchUpdatedPayload) => {
      updateMinimapCells((prev) => upsertCells(prev, updates));

      updateCells((prev) =>
        upsertCells(
          prev,
          updates.filter((update) =>
            isCellInsideVisibleBounds(update.x, update.y, visibleCellBounds),
          ),
        ),
      );

      if (selectedCellRef.current) {
        const updatedSelectedCell = updates.find(
          (update) =>
            update.x === selectedCellRef.current?.x &&
            update.y === selectedCellRef.current?.y,
        );

        if (updatedSelectedCell) {
          const nextSelectedCell: Cell = {
            ...selectedCellRef.current,
            color: updatedSelectedCell.color,
            status: "painted",
          };

          setSelectedCell(nextSelectedCell);
          selectedCellRef.current = nextSelectedCell;
        }
      }
    },
    [updateCells, updateMinimapCells, visibleCellBounds],
  );

  const clearSelectedCell = useCallback(() => {
    setSelectedCell(null);
    selectedCellRef.current = null;
    setSelectionVisible(false);
    emitSelectionUpdate(null);
  }, [emitSelectionUpdate]);

  const applySelectedCellColor = useCallback(
    (color: string) => {
      const currentSelectedCell = selectedCellRef.current;

      if (!currentSelectedCell) {
        return;
      }

      const nextSelectedCell: Cell = {
        ...currentSelectedCell,
        color,
        status: "painted",
      };

      updateCells((prev) =>
        upsertCells(prev, [
          {
            x: nextSelectedCell.x,
            y: nextSelectedCell.y,
            color,
          },
        ]),
      );

      updateMinimapCells((prev) =>
        upsertCells(prev, [
          {
            x: nextSelectedCell.x,
            y: nextSelectedCell.y,
            color,
          },
        ]),
      );

      setSelectedCell(nextSelectedCell);
      selectedCellRef.current = nextSelectedCell;
    },
    [updateCells, updateMinimapCells],
  );

  const hideSelectedCellVisual = useCallback(() => {
    setSelectionVisible(false);
    emitSelectionUpdate(null);
  }, [emitSelectionUpdate]);

  return {
    paintCanvasRef,
    canvasRef,
    containerRef,
    cells,
    minimapCells,
    canvasId,
    gridX,
    gridY,
    selectedCell,
    displaySelectedCell: selectionVisible ? selectedCell : null,
    viewport,
    surfaceSize: viewportSize,
    cameraX,
    cameraY,
    zoom,
    worldOffset,
    navigateToCoordinate,
    resetCanvasZoom,
    setCanvasId,
    setGridX,
    setGridY,
    updateCells,
    updateMinimapCells,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    isDraggingCanvas,
    handleWheel,
    handleCanvasUpdated,
    handleCanvasBatchUpdated,
    clearSelectedCell,
    applySelectedCellColor,
    hideSelectedCellVisual,
  };
}
