import type { Cell } from "@/features/gameplay/canvas";
import type { GamePhase } from "./game-phase.types";

export interface RoundInfoState {
  phase: GamePhase;
  roundId: number | null;
  roundNumber: number | null;
  roundDurationSec: number | null;
  totalRounds: number;
  formattedGameEndTime: string | null;
  remainingSeconds: number | null;
  formattedRemainingTime: string | null;
  isRoundExpired: boolean;
  phaseStartedAt: string | null;
  phaseEndsAt: string | null;
}

export interface PhaseTimingState {
  roundStartWaitSec: number;
  roundResultDelaySec: number;
  gameEndWaitSec: number;
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
  votes: Record<string, number>;
  remaining: number | null;
  phaseTiming: PhaseTimingState;
}
