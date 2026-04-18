import type { GamePhase } from "@/features/gameplay/session/model/game-phase.types";
import type { GameConfig } from "@/shared/config/game-config";

export type CanvasStatus = "playing" | "finished";

export type CellStatus = "painted" | "idle";

export interface Canvas {
  id: number;
  gridX: number;
  gridY: number;
  configProfileKey: string;
  backgroundAssetKey: string | null;
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

export interface CanvasCurrentResponse {
  canvas: Canvas;
  cells: Cell[];
  gameConfig: GameConfig;
}

export interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}
