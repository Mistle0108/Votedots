import { useCallback, useState } from "react";
import {
  roomApi,
  type RoomDetailResponse,
  type RoomListItem,
} from "../api/room.api";
import { useI18n } from "@/shared/i18n";

export default function useLobbyRooms() {
  const { t } = useI18n();
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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const loadRooms = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent || !hasLoadedOnce) {
      setLoading(true);
    }

    if (!silent) {
      setError(null);
    }

    try {
      const { data } = await roomApi.getRooms();
      setRooms(data.rooms);
      setError(null);
      setHasLoadedOnce(true);
      return data.rooms;
    } catch {
      if (!silent || !hasLoadedOnce) {
        setError(t("lobby.roomList.loadFailed"));
        setRooms([]);
      }

      return null;
    } finally {
      if (!silent || !hasLoadedOnce) {
        setLoading(false);
      }
    }
  }, [hasLoadedOnce, t]);

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
      setDetailError(t("lobby.roomList.detailLoadFailed"));
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

  const clearSelectedRoomDetail = useCallback(() => {
    setSelectedRoomId(null);
    setSelectedRoomDetail(null);
    setDetailError(null);
  }, []);

  return {
    rooms,
    selectedRoomId,
    selectedRoomDetail,
    hasLoadedOnce,
    loading,
    error,
    detailLoading,
    detailError,
    loadRooms,
    loadRoomDetail,
    clearSelectedRoomDetail,
  };
}
