import api from "@/shared/api/client";
import { CanvasCurrentResponse } from "../model/canvas.types";

export const canvasApi = {
  getCurrent: () => api.get<CanvasCurrentResponse>("/canvas/current"),
};

export type { CanvasCurrentResponse };
