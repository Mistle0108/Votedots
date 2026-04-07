import type { GamePhase } from "@/features/gameplay/session/model/game-phase.types";

export type CanvasStatus = "playing" | "finished";

export type CellStatus = "idle" | "active" | "painted" | "locked";

export interface Canvas {
  id: number;
  gridX: number;
  gridY: number;
  status: CanvasStatus;
  phase: GamePhase;
  phaseStartedAt: string;
  phaseEndsAt: string | null;
  currentRoundNumber: number;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
  roundDurationSec: number | null;
}

export interface Cell {
  id: number;
  x: number;
  y: number;
  color: string | null;
  status: CellStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
}

export interface CanvasCurrentResponse {
  canvas: Canvas;
  cells: Cell[];
}

export interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}
