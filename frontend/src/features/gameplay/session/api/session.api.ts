import api from "@/shared/api/client";
import type { CanvasCurrentResponse } from "@/features/gameplay/canvas";
import { voteApi } from "@/features/gameplay/vote/api/vote.api";

export interface RoundStateResponse {
  status: "active" | "waiting";
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
  canvasId: number;
  count: number;
}

export const sessionApi = {
  getCurrentCanvas: () => api.get<CanvasCurrentResponse>("/canvas/current"),

  getActiveRound: (canvasId: number) =>
    api.get<RoundStateResponse>(`/canvas/${canvasId}/rounds/active`),

  getTickets: (roundId: number) => voteApi.getTickets(roundId),

  getCurrentParticipantCount: () =>
    api.get<ParticipantCountResponse>("/canvas/current/participants/count"),

  createCanvas: () => api.post("/canvas"),
};

export type { CanvasCurrentResponse };
