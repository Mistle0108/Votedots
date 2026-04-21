import api from "@/shared/api/client";
import type { CanvasHistoryResponse } from "../model/history.types";

export const historyApi = {
  getCanvasHistory: (canvasId: number, signal?: AbortSignal) =>
    api.get<CanvasHistoryResponse>(`/canvas/${canvasId}/history`, {
      signal,
    }),
};
