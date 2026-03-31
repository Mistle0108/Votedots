import api from "@/shared/api/client";
import type { CanvasCurrentResponse } from "@/features/gameplay/canvas";
import type { RoundStateResponse } from "@/features/gameplay/round";
import { gameplayVoteApi } from "@/features/gameplay/vote";

export const sessionApi = {
  getCurrentCanvas: () => api.get<CanvasCurrentResponse>("/canvas/current"),

  getActiveRound: (canvasId: number) =>
    api.get<RoundStateResponse>(`/canvas/${canvasId}/rounds/active`),

  getTickets: (roundId: number) => gameplayVoteApi.getTickets(roundId),

  createCanvas: () => api.post("/canvas"),
};

export type { CanvasCurrentResponse, RoundStateResponse };
