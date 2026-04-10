import api from "@/shared/api/client";
import type { CanvasCurrentResponse } from "@/features/gameplay/canvas";
import { voteApi } from "@/features/gameplay/vote/api/vote.api";
import type { GamePhase } from "../model/game-phase.types";

export interface RoundStateResponse {
  status: "active" | "waiting";
  canvasPhase: GamePhase;
  phaseStartedAt: string | null;
  phaseEndsAt: string | null;
  round: {
    id: number;
    roundNumber: number;
    startedAt: string;
    endedAt: string | null;
    roundDurationSec: number;
    totalRounds: number;
    gameEndAt: string;
  };
  timer: {
    remainingSeconds: number;
    isRoundExpired: boolean;
    roundDurationSec: number;
    totalRounds: number;
    gameEndAt: string;
  };
}

export interface ParticipantCountResponse {
  count: number;
}

export type ParticipantStatus = "voting" | "waiting";

export interface ParticipantItem {
  sessionId: string;
  voterUuid: string;
  nickname: string;
  status: ParticipantStatus;
}

export interface ParticipantListResponse {
  participants: ParticipantItem[];
}

export interface CreateCanvasRequest {
  profileKey?: string;
}

export const sessionApi = {
  getCurrentCanvas: () => api.get<CanvasCurrentResponse>("/canvas/current"),

  getActiveRound: (canvasId: number) =>
    api.get<RoundStateResponse>(`/canvas/${canvasId}/rounds/active`),

  getTickets: (roundId: number) => voteApi.getTickets(roundId),

  getVoteStatus: (roundId: number) => voteApi.getStatus(roundId),

  getCurrentParticipantCount: () =>
    api.get<ParticipantCountResponse>("/canvas/current/participants/count"),

  getCurrentParticipantList: () =>
    api.get<ParticipantListResponse>("/canvas/current/participants"),

  createCanvas: (payload?: CreateCanvasRequest) => api.post("/canvas", payload),
};

export type { CanvasCurrentResponse };
