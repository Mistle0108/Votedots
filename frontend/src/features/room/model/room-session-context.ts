const ROOM_SESSION_STORAGE_KEY = "votedots:room-session-context";

export interface RoomSessionContext {
  roomId: number;
  publicRoomNumber: number | null;
  canvasId: number;
  type: "public" | "private";
}

export function getStoredRoomSessionContext(): RoomSessionContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(ROOM_SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RoomSessionContext>;

    if (
      typeof parsed.roomId !== "number" ||
      (parsed.publicRoomNumber !== null &&
        typeof parsed.publicRoomNumber !== "number") ||
      typeof parsed.canvasId !== "number" ||
      (parsed.type !== "public" && parsed.type !== "private")
    ) {
      return null;
    }

    return {
      roomId: parsed.roomId,
      publicRoomNumber: parsed.publicRoomNumber ?? null,
      canvasId: parsed.canvasId,
      type: parsed.type,
    };
  } catch {
    return null;
  }
}

export function setStoredRoomSessionContext(
  context: RoomSessionContext | null,
): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!context) {
    window.sessionStorage.removeItem(ROOM_SESSION_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(
    ROOM_SESSION_STORAGE_KEY,
    JSON.stringify(context),
  );
}

export function clearStoredRoomSessionContext(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(ROOM_SESSION_STORAGE_KEY);
}
