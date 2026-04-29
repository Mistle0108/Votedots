import type { GamePhase } from "@/features/gameplay/session/model/game-phase.types";
import type { GameConfig } from "@/shared/config/game-config";

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
  introPhaseSec: number;
  roundStartWaitSec: number;
  roundResultDelaySec: number;
  gameEndWaitSec: number;
}

export interface VoteSessionState {
  votes: Record<string, number>;
  remaining: number | null;
  votingCellIds: Set<string>;
  topColorMap: Map<string, string>;
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
  resultTemplateImageUrl: string | null;
  round: RoundInfoState;
  votes: Record<string, number>;
  remaining: number | null;
  phaseTiming: PhaseTimingState;
  gameConfig: GameConfig;
}
