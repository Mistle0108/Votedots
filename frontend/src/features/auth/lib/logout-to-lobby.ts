import type { NavigateFunction } from "react-router-dom";
import { clearActiveGuestEntryScope } from "@/features/auth/model/guest-entry";
import { clearStoredRoomSessionContext } from "@/features/room/model/room-session-context";
import { authApi } from "../api/auth.api";

export async function logoutToLobby(
  navigate: NavigateFunction,
): Promise<void> {
  try {
    await authApi.logout();
  } finally {
    clearActiveGuestEntryScope();
    clearStoredRoomSessionContext();
    navigate("/lobby", { replace: true });
  }
}
