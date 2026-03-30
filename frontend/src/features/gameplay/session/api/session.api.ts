import api from "@/shared/api/client";
import type { CanvasCurrentResponse } from "@/features/gameplay/canvas";
import { gameplayVoteApi } from "@/features/gameplay/vote";
import { roundApi, type RoundStateResponse } from "@/features/gameplay/round";

export const sessionApi = {
  getCurrentCanvas: () => api.get<CanvasCurrentResponse>("/canvas/current"),

  getActiveRound: (canvasId: number) => roundApi.getActiveRound(canvasId),

  getTickets: (roundId: number) => gameplayVoteApi.getTickets(roundId),

  createCanvas: () => api.post("/canvas"),
};

export type { CanvasCurrentResponse, RoundStateResponse };
