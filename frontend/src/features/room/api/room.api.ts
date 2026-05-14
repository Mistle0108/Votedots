import api from "@/shared/api/client";

export interface RoomListItem {
  roomId: number;
  publicRoomNumber: number;
  title: string;
  type: "public" | "private";
  status: "active" | "game_end_wait" | "expired";
  participantCount: number;
}

export interface PublicRoomDetailResponse {
  room: {
    roomId: number;
    publicRoomNumber: number;
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
    };
    participantCount: number;
  };
}

export interface PrivateRoomDetailResponse {
  room: {
    roomId: number;
    publicRoomNumber: number;
    title: string;
    type: "private";
    status: "active" | "game_end_wait" | "expired";
  };
}

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
    publicRoomNumber: number;
    title: string;
    type: "public" | "private";
  };
  accessCode: string | null;
  entered: boolean;
}

export interface RoomEnterResponse {
  room: {
    roomId: number;
    publicRoomNumber: number;
    type: "public" | "private";
  };
}

export const roomApi = {
  getRooms: () => api.get<{ rooms: RoomListItem[] }>("/rooms"),
  getRoomDetail: (publicRoomNumber: number) =>
    api.get<PublicRoomDetailResponse | PrivateRoomDetailResponse>(
      `/rooms/${publicRoomNumber}`,
    ),
  createRoom: (payload: RoomCreateRequest) =>
    api.post<RoomCreateResponse>("/rooms", payload),
  enterPublicRoom: (publicRoomNumber: number) =>
    api.post<RoomEnterResponse>("/rooms/enter", {
      type: "public",
      publicRoomNumber,
    }),
  enterPrivateRoom: (accessCode: string) =>
    api.post<RoomEnterResponse>("/rooms/enter", {
      type: "private",
      accessCode,
    }),
};
