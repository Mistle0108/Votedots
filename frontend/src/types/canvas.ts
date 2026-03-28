export type CanvasStatus = 'playing' | 'finished';

export type CellStatus = 'idle' | 'active' | 'painted' | 'locked';

export interface Canvas {
  id: number;
  gridX: number;
  gridY: number;
  status: CanvasStatus;
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
  color: string | null; // HEX (ex: "#342e7a"), null = 미칠해짐
  status: CellStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
}

export interface CanvasCurrentResponse {
  canvas: Canvas;
  cells: Cell[];
  roundDurationSec: number;
}