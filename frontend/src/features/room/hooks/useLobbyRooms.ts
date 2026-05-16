import { useCallback, useEffect, useState } from "react";
import {
  roomApi,
  type RoomDetailResponse,
  type RoomListItem,
} from "../api/room.api";

export default function useLobbyRooms() {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(
    null,
  );
  const [selectedRoomDetail, setSelectedRoomDetail] =
    useState<RoomDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await roomApi.getRooms();
      setRooms(data.rooms);
      return data.rooms;
    } catch {
      setError("방 목록을 불러오지 못했습니다.");
      setRooms([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoomDetail = useCallback(async (roomId: number) => {
    setDetailLoading(true);
    setDetailError(null);

    try {
      const { data } = await roomApi.getRoomDetail(roomId);
      setSelectedRoomId(roomId);
      setSelectedRoomDetail(data);
      return data;
    } catch {
      setSelectedRoomId(roomId);
      setSelectedRoomDetail(null);
      setDetailError("방 정보를 불러오지 못했습니다.");
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const clearSelectedRoomDetail = useCallback(() => {
    setSelectedRoomId(null);
    setSelectedRoomDetail(null);
    setDetailError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapRooms = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await roomApi.getRooms();

        if (cancelled) {
          return;
        }

        setRooms(data.rooms);

        if (data.rooms.length > 0) {
          void loadRoomDetail(data.rooms[0].roomId);
        }
      } catch {
        if (!cancelled) {
          setError("방 목록을 불러오지 못했습니다.");
          setRooms([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrapRooms();

    return () => {
      cancelled = true;
    };
  }, [loadRoomDetail]);

  return {
    rooms,
    selectedRoomId,
    selectedRoomDetail,
    loading,
    error,
    detailLoading,
    detailError,
    loadRooms,
    loadRoomDetail,
    clearSelectedRoomDetail,
  };
}
