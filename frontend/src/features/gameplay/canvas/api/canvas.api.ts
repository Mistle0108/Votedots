import api from "@/shared/api/client";
import { CanvasCurrentResponse } from "../model/canvas.types";

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

export const canvasApi = {
  getCurrent: () => api.get<CanvasCurrentResponse>("/canvas/current"),

  getActiveRound: (canvasId: number) =>
    api.get<RoundStateResponse>(`/canvas/${canvasId}/rounds/active`),

  createCanvas: () => api.post("/canvas"),
};
