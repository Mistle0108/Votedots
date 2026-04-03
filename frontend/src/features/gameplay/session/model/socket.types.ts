export interface CanvasJoinedPayload {
  canvasId: number;
  status: "voting" | "waiting";
  restored: boolean;
}

export interface RoundStartedPayload {
  roundId: number;
  roundNumber: number;
  startedAt: string;
  roundDurationSec: number;
  totalRounds: number;
  gameEndAt: string;
}

export interface RoundEndedPayload {
  roundId: number;
  roundNumber: number;
  endedAt: string;
  winningCell: { id: number; x: number; y: number; color: string } | null;
}

export interface CanvasUpdatedPayload {
  cellId: number;
  x: number;
  y: number;
  color: string;
}

export interface VoteUpdatePayload {
  roundId: number;
  cellId: number;
  color: string;
  votes: Record<string, number>;
}

export interface TimerUpdatePayload {
  roundId: number;
  roundNumber: number;
  remainingSeconds: number;
  isRoundExpired: boolean;
  roundDurationSec: number;
  totalRounds: number;
  gameEndAt: string;
}

export interface ParticipantsUpdatedPayload {
  canvasId: number;
  count: number;
}
