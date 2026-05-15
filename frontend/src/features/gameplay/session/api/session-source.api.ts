import api from "@/shared/api/client";
import type { Canvas } from "@/features/gameplay/canvas";
import type { GameConfig } from "@/shared/config/game-config";
import type {
  ParticipantCountResponse,
  ParticipantListResponse,
} from "./session.api";

export interface GameplayCurrentCanvasResponse {
  canvas: Canvas;
  serverNow: string;
  gameConfig: GameConfig;
}

export interface GameplaySessionSourceApi {
  key: "plaza" | "room";
  getCurrentCanvas: () => Promise<{
    data: GameplayCurrentCanvasResponse;
  }>;
  getCurrentParticipantCount: () => Promise<{
    data: ParticipantCountResponse;
  }>;
  getCurrentParticipantList: () => Promise<{
    data: ParticipantListResponse;
  }>;
}

export const plazaSessionSourceApi: GameplaySessionSourceApi = {
  key: "plaza",
  getCurrentCanvas: () => api.get<GameplayCurrentCanvasResponse>("/canvas/current"),
  getCurrentParticipantCount: () =>
    api.get<ParticipantCountResponse>("/canvas/current/participants/count"),
  getCurrentParticipantList: () =>
    api.get<ParticipantListResponse>("/canvas/current/participants"),
};

export const roomSessionSourceApi: GameplaySessionSourceApi = {
  key: "room",
  getCurrentCanvas: () => api.get<GameplayCurrentCanvasResponse>("/rooms/current"),
  getCurrentParticipantCount: () =>
    api.get<ParticipantCountResponse>("/rooms/current/participants/count"),
  getCurrentParticipantList: () =>
    api.get<ParticipantListResponse>("/rooms/current/participants"),
};
