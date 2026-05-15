import { useCallback, useEffect, useState } from "react";
import {
  roomApi,
  type RoomDetailResponse,
  type RoomListItem,
} from "../api/room.api";

export default function useLobbyRooms() {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<number | null>(
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

  const loadRoomDetail = useCallback(async (publicRoomNumber: number) => {
    setDetailLoading(true);
    setDetailError(null);

    try {
      const { data } = await roomApi.getRoomDetail(publicRoomNumber);
      setSelectedRoomNumber(publicRoomNumber);
      setSelectedRoomDetail(data);
      return data;
    } catch {
      setSelectedRoomNumber(publicRoomNumber);
      setSelectedRoomDetail(null);
      setDetailError("방 정보를 불러오지 못했습니다.");
      return null;
    } finally {
      setDetailLoading(false);
    }
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
          void loadRoomDetail(data.rooms[0].publicRoomNumber);
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
    selectedRoomNumber,
    selectedRoomDetail,
    loading,
    error,
    detailLoading,
    detailError,
    loadRooms,
    loadRoomDetail,
  };
}
