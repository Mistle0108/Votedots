import type { GamePhase } from "./game-phase.types";

export interface CanvasJoinedPayload {
  canvasId: number;
  status: "voting" | "waiting";
  restored: boolean;
}

export interface PhaseUpdatedPayload {
  canvasId: number;
  phase: GamePhase;
  roundId: number | null;
  roundNumber: number | null;
  roundDurationSec: number | null;
  remainingSeconds: number | null;
  serverNow: string;
  totalRounds: number;
  phaseStartedAt: string | null;
  phaseEndsAt: string | null;
}

export interface RoundStartedPayload {
  roundId: number;
  roundNumber: number;
  startedAt: string;
  serverNow: string;
  roundEndsAt: string;
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
  serverNow: string;
  roundEndsAt: string;
  roundDurationSec: number;
  totalRounds: number;
  gameEndAt: string;
}

export interface ParticipantSelectionPayload {
  x: number;
  y: number;
}

export interface ParticipantItemPayload {
  sessionId: string;
  voterUuid: string;
  nickname: string;
  status: "voting" | "waiting";
  selectedCell: ParticipantSelectionPayload | null;
}

export interface ParticipantsUpdatedPayload {
  canvasId: number;
  count: number;
  participants: ParticipantItemPayload[];
}

export interface SessionEndedPayload {
  reason?: string;
}

export interface RoomExpiredPayload {
  canvasId: number;
  roomId: number;
  reason: "expired" | "terminated_by_owner";
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
