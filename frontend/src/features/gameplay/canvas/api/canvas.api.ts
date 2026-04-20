import api from "@/shared/api/client";
import type {
  CanvasChunkQuery,
  CanvasChunkResponse,
} from "../model/canvas.types";

export const canvasApi = {
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

export type { CanvasChunkQuery, CanvasChunkResponse };
