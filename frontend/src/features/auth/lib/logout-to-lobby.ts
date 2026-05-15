import type { NavigateFunction } from "react-router-dom";
import { clearStoredRoomSessionContext } from "@/features/room/model/room-session-context";
import { authApi } from "../api/auth.api";

export async function logoutToLobby(
  navigate: NavigateFunction,
): Promise<void> {
  try {
    await authApi.logout();
  } finally {
    clearStoredRoomSessionContext();
    navigate("/lobby", { replace: true });
  }
}
