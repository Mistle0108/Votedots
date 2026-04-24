import type { GamePhase } from "@/features/gameplay/session/model/game-phase.types";

export type CanvasStatus = "playing" | "finished";

export type CellStatus = "painted" | "idle";

export interface Canvas {
  id: number;
  gridX: number;
  gridY: number;
  configProfileKey: string;
  backgroundAssetKey: string | null;
  playBackgroundAssetKey: string | null;
  resultTemplateAssetKey: string | null;
  status: CanvasStatus;
  phase: GamePhase;
  phaseStartedAt: string;
  phaseEndsAt: string | null;
  currentRoundNumber: number;
  startedAt: string;
  endedAt: string | null;
}

export interface Cell {
  x: number;
  y: number;
  color: string | null;
  status: CellStatus;
}

export interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface VisibleCellBounds {
  startCellX: number;
  endCellX: number;
  startCellY: number;
  endCellY: number;
}

export interface CanvasChunkQuery {
  startChunkX: number;
  endChunkX: number;
  startChunkY: number;
  endChunkY: number;
  chunkSize?: number;
}

export interface CanvasChunkBounds {
  minCellX: number;
  maxCellX: number;
  minCellY: number;
  maxCellY: number;
}

export interface CanvasChunkResponse {
  chunkSize: number;
  ranges: {
    startChunkX: number;
    endChunkX: number;
    startChunkY: number;
    endChunkY: number;
  };
  bounds: CanvasChunkBounds;
  cells: Cell[];
}
