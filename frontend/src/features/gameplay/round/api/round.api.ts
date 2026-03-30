import api from "@/shared/api/client";
import type { RoundStateResponse } from "../model/round.types";

export const roundApi = {
  getActiveRound: (canvasId: number) =>
    api.get<RoundStateResponse>(`/canvas/${canvasId}/rounds/active`),
};
