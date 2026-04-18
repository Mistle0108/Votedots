// TO-BE
import api from "@/shared/api/client";
import type {
  CanvasChunkQuery,
  CanvasChunkResponse,
  CanvasCurrentResponse,
} from "../model/canvas.types";

export const canvasApi = {
  getCurrent: () => api.get<CanvasCurrentResponse>("/canvas/current"),
  getChunks: (
    canvasId: number,
    params: CanvasChunkQuery,
    signal?: AbortSignal,
  ) =>
    api.get<CanvasChunkResponse>(`/canvas/${canvasId}/chunks`, {
      params,
      signal,
    }),
};

export type { CanvasChunkQuery, CanvasChunkResponse, CanvasCurrentResponse };
