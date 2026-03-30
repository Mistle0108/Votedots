import type { Cell } from "@/features/gameplay/canvas";

export interface RoundInfoState {
  roundId: number | null;
  roundNumber: number | null;
  roundDurationSec: number | null;
  totalRounds: number;
  formattedGameEndTime: string | null;
  remainingSeconds: number | null;
  formattedRemainingTime: string | null;
  isRoundExpired: boolean;
}

export interface VoteSessionState {
  votes: Record<string, number>;
  remaining: number | null;
  votingCellIds: Set<number>;
  topColorMap: Map<number, string>;
}

export interface CanvasSessionState {
  canvasId: number | null;
  gridX: number;
  gridY: number;
  cells: Cell[];
  selectedCell: Cell | null;
  previewColor: string | null;
}

export interface SessionStatusState {
  loading: boolean;
  error: string | null;
  gameEnded: boolean;
  canvasReady: boolean;
}

export interface SessionBootstrapResult {
  canvasId: number;
  gridX: number;
  gridY: number;
  cells: Cell[];
  round: RoundInfoState;
  remaining: number | null;
}
