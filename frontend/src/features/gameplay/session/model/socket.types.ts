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

export interface CanvasUpdatedPayload {
  cellId: number;
  x: number;
  y: number;
  color: string;
}

// 추가: 여러 셀을 한 번에 반영하기 위한 batch item
export interface CanvasBatchUpdatedCellPayload {
  cellId: number;
  x: number;
  y: number;
  color: string;
}

// 추가: 라운드 종료 후 여러 셀을 한 번에 반영하는 batch payload
export interface CanvasBatchUpdatedPayload {
  updates: CanvasBatchUpdatedCellPayload[];
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

export interface SessionEndedPayload {
  reason?: string;
}
