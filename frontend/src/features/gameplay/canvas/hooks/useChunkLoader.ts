import { useCallback, useEffect, useMemo, useRef } from "react";
import { canvasApi } from "../api/canvas.api";
import { MINIMAP_SIZE } from "../model/canvas.constants";
import type { Cell, Viewport } from "../model/canvas.types";

const DEFAULT_CHUNK_SIZE = 64;
const VIEWPORT_PREFETCH_MARGIN = 1;
const REQUEST_DEBOUNCE_MS = 120;

interface ChunkRange {
  startChunkX: number;
  endChunkX: number;
  startChunkY: number;
  endChunkY: number;
  chunkSize: number;
}

interface ChunkCellCoordinate {
  x: number;
  y: number;
}

interface UseChunkLoaderParams {
  canvasId: number | null;
  gridX: number;
  gridY: number;
  viewport: Viewport | null;
  updateCells: (updater: Cell[] | ((prev: Cell[]) => Cell[])) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getChunkKey(chunkX: number, chunkY: number): string {
  return `${chunkX}:${chunkY}`;
}

function getChunkKeyFromCell(x: number, y: number, chunkSize: number): string {
  return getChunkKey(Math.floor(x / chunkSize), Math.floor(y / chunkSize));
}

function buildChunkKeys(range: ChunkRange): string[] {
  const keys: string[] = [];

  for (let chunkY = range.startChunkY; chunkY <= range.endChunkY; chunkY += 1) {
    for (
      let chunkX = range.startChunkX;
      chunkX <= range.endChunkX;
      chunkX += 1
    ) {
      keys.push(getChunkKey(chunkX, chunkY));
    }
  }

  return keys;
}

function buildChunkRange(
  viewport: Viewport,
  gridX: number,
  gridY: number,
  chunkSize: number,
): ChunkRange | null {
  if (gridX <= 0 || gridY <= 0) {
    return null;
  }

  const minimapScale = MINIMAP_SIZE / Math.max(gridX, gridY, 1);

  if (!Number.isFinite(minimapScale) || minimapScale <= 0) {
    return null;
  }

  const maxCellX = Math.max(0, gridX - 1);
  const maxCellY = Math.max(0, gridY - 1);

  const startCellX = clamp(
    Math.floor(viewport.left / minimapScale),
    0,
    maxCellX,
  );
  const startCellY = clamp(
    Math.floor(viewport.top / minimapScale),
    0,
    maxCellY,
  );
  const endCellX = clamp(
    Math.ceil((viewport.left + viewport.width) / minimapScale) - 1,
    0,
    maxCellX,
  );
  const endCellY = clamp(
    Math.ceil((viewport.top + viewport.height) / minimapScale) - 1,
    0,
    maxCellY,
  );

  return {
    startChunkX: Math.max(
      0,
      Math.floor(startCellX / chunkSize) - VIEWPORT_PREFETCH_MARGIN,
    ),
    endChunkX: Math.max(
      0,
      Math.floor(endCellX / chunkSize) + VIEWPORT_PREFETCH_MARGIN,
    ),
    startChunkY: Math.max(
      0,
      Math.floor(startCellY / chunkSize) - VIEWPORT_PREFETCH_MARGIN,
    ),
    endChunkY: Math.max(
      0,
      Math.floor(endCellY / chunkSize) + VIEWPORT_PREFETCH_MARGIN,
    ),
    chunkSize,
  };
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    error.name === "CanceledError" ||
    ("code" in error && error.code === "ERR_CANCELED")
  );
}

export function useChunkLoader({
  canvasId,
  gridX,
  gridY,
  viewport,
  updateCells,
}: UseChunkLoaderParams) {
  const loadedChunkKeysRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<number | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  const chunkRange = useMemo(() => {
    if (!canvasId || !viewport) {
      return null;
    }

    return buildChunkRange(viewport, gridX, gridY, DEFAULT_CHUNK_SIZE);
  }, [canvasId, gridX, gridY, viewport]);

  const invalidateChunksByCells = useCallback(
    (cells: ChunkCellCoordinate[], chunkSize = DEFAULT_CHUNK_SIZE) => {
      if (cells.length === 0) {
        return;
      }

      const nextLoadedChunkKeys = new Set(loadedChunkKeysRef.current);

      for (const cell of cells) {
        if (!Number.isFinite(cell.x) || !Number.isFinite(cell.y)) {
          continue;
        }

        if (cell.x < 0 || cell.y < 0) {
          continue;
        }

        nextLoadedChunkKeys.delete(
          getChunkKeyFromCell(cell.x, cell.y, chunkSize),
        );
      }

      loadedChunkKeysRef.current = nextLoadedChunkKeys;
    },
    [],
  );

  useEffect(() => {
    loadedChunkKeysRef.current = new Set();

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
      activeRequestRef.current = null;
    }
  }, [canvasId]);

  useEffect(() => {
    if (!canvasId || !chunkRange) {
      return;
    }

    const requiredChunkKeys = buildChunkKeys(chunkRange);
    const hasMissingChunk = requiredChunkKeys.some(
      (chunkKey) => !loadedChunkKeysRef.current.has(chunkKey),
    );

    if (!hasMissingChunk) {
      return;
    }

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
      activeRequestRef.current = null;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const controller = new AbortController();
      activeRequestRef.current = controller;

      void canvasApi
        .getChunks(canvasId, chunkRange, controller.signal)
        .then(({ data }) => {
          requiredChunkKeys.forEach((chunkKey) => {
            loadedChunkKeysRef.current.add(chunkKey);
          });

          updateCells((prev) => {
            const next = [...prev];

            for (const incoming of data.cells) {
              const index = next.findIndex(
                (cell) => cell.x === incoming.x && cell.y === incoming.y,
              );

              if (index === -1) {
                next.push(incoming);
                continue;
              }

              next[index] = incoming;
            }

            return next;
          });
        })
        .catch((error: unknown) => {
          if (isAbortError(error)) {
            return;
          }

          console.error("[chunk-loader] failed to fetch chunks:", error);
        })
        .finally(() => {
          if (activeRequestRef.current === controller) {
            activeRequestRef.current = null;
          }
        });
    }, REQUEST_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [canvasId, chunkRange, updateCells]);

  return {
    invalidateChunksByCells,
  };
}
