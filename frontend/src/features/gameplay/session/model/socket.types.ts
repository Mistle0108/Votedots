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
}

// TO-BE
export interface CanvasUpdatedPayload {
  x: number;
  y: number;
  color: string;
}

export interface CanvasBatchUpdatedCellPayload {
  x: number;
  y: number;
  color: string;
}

export interface CanvasBatchUpdatedPayload {
  updates: CanvasBatchUpdatedCellPayload[];
}

export interface VoteUpdatePayload {
  roundId: number;
  x: number;
  y: number;
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

export interface SessionEndedPayload {
  reason?: string;
}

export interface RoundSummaryReadyPayload {
  canvasId: number;
  roundId: number;
  roundNumber: number;
  summaryId: number;
}

export interface GameSummaryReadyPayload {
  canvasId: number;
  summaryId: number;
}
