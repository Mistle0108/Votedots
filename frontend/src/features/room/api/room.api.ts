import api from "@/shared/api/client";
import type { RoomSessionContext } from "../model/room-session-context";

export interface RoomConfigProfile {
  key: string;
  snapshot: {
    phases: {
      introPhaseSec: number;
      roundStartWaitSec: number;
      roundDurationSec: number;
      roundResultDelaySec: number;
      gameEndWaitSec: number;
      restartDelaySec: number;
    };
    rules: {
      totalRounds: number;
      votesPerRound: number;
      participantGracePeriodSec: number;
    };
    board: {
      gridSizeX: number;
      gridSizeY: number;
      cellSize: number;
    };
  };
}

export interface RoomListItem {
  roomId: number;
  title: string;
  type: "public" | "private";
  status: "active" | "game_end_wait" | "expired";
  participantCount: number;
  isOwner: boolean;
}

export interface PublicRoomDetailResponse {
  room: {
    roomId: number;
    title: string;
    type: "public";
    status: "active" | "game_end_wait" | "expired";
    canvas: {
      id: number;
      gridX: number;
      gridY: number;
      currentRoundNumber: number | null;
      totalRounds: number;
      snapshotUrl: string | null;
      templateImageUrl: string | null;
    };
    participantCount: number;
    manage: {
      settings: {
        title: string;
        type: "public" | "private";
        profileKey: string;
        introPhaseSec: number;
        totalRounds: number;
        votesPerRound: number;
        gameEndWaitSec: number;
      };
      accessCode: string | null;
    } | null;
  };
}

export interface PrivateRoomDetailResponse {
  room: {
    roomId: number;
    title: string;
    type: "private";
    status: "active" | "game_end_wait" | "expired";
    manage: {
      settings: {
        title: string;
        type: "public" | "private";
        profileKey: string;
        introPhaseSec: number;
        totalRounds: number;
        votesPerRound: number;
        gameEndWaitSec: number;
      };
      accessCode: string | null;
    } | null;
  };
}

export type RoomDetailResponse =
  | PublicRoomDetailResponse
  | PrivateRoomDetailResponse;

export interface RoomCreateRequest {
  title: string;
  type: "public" | "private";
  profileKey?: string;
  introPhaseSec: number;
  totalRounds: number;
  votesPerRound: number;
}

export interface RoomCreateResponse {
  room: {
    roomId: number;
    title: string;
    type: "public" | "private";
  };
  accessCode: string;
  entered: boolean;
}

export interface RoomEnterResponse {
  room: {
    roomId: number;
    type: "public" | "private";
  };
}

export interface RoomResolveByAccessCodeResponse {
  room: {
    roomId: number;
    type: "public" | "private";
    status: "active" | "game_end_wait" | "expired";
  };
}

export interface RoomCurrentManageResponse {
  room: {
    roomId: number;
    title: string;
    type: "public" | "private";
    settings: {
      title: string;
      type: "public" | "private";
      profileKey: string;
      introPhaseSec: number;
      totalRounds: number;
      votesPerRound: number;
      gameEndWaitSec: number;
    };
    accessCode: string | null;
  };
}

export const roomApi = {
  getRooms: () => api.get<{ rooms: RoomListItem[] }>("/rooms"),
  getConfigProfiles: () =>
    api.get<{ profiles: RoomConfigProfile[] }>("/rooms/config-profiles"),
  getRoomDetail: (roomId: number) =>
    api.get<RoomDetailResponse>(`/rooms/${roomId}`),
  createRoom: (payload: RoomCreateRequest) =>
    api.post<RoomCreateResponse>("/rooms", payload),
  resolveRoomByAccessCode: (accessCode: string) =>
    api.post<RoomResolveByAccessCodeResponse>("/rooms/resolve-access-code", {
      accessCode,
    }),
  enterRoom: (accessCode: string) =>
    api.post<RoomEnterResponse>("/rooms/enter", {
      accessCode,
    }),
  enterPublicRoomById: (roomId: number) =>
    api.post<RoomEnterResponse>(`/rooms/${roomId}/enter-public`),
  getCurrentManage: () =>
    api.get<RoomCurrentManageResponse>("/rooms/current/manage"),
  endGameCurrent: () => api.post<{ ok: true }>("/rooms/current/end-game"),
  terminateCurrent: () => api.post<{ ok: true }>("/rooms/current/terminate"),
};

export function toRoomSessionContext(
  room: RoomCreateResponse["room"] | RoomEnterResponse["room"],
): RoomSessionContext {
  return {
    roomId: room.roomId,
    type: room.type,
  };
}
