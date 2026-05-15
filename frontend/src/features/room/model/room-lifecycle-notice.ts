export type RoomLifecycleNoticeReason = "expired" | "terminated_by_owner";

const ROOM_LIFECYCLE_NOTICE_STORAGE_KEY = "votedots:room-lifecycle-notice";

export function setStoredRoomLifecycleNotice(
  reason: RoomLifecycleNoticeReason,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(ROOM_LIFECYCLE_NOTICE_STORAGE_KEY, reason);
}

export function consumeStoredRoomLifecycleNotice(): RoomLifecycleNoticeReason | null {
  if (typeof window === "undefined") {
    return null;
  }

  const reason = window.sessionStorage.getItem(
    ROOM_LIFECYCLE_NOTICE_STORAGE_KEY,
  );
  window.sessionStorage.removeItem(ROOM_LIFECYCLE_NOTICE_STORAGE_KEY);

  return reason === "expired" || reason === "terminated_by_owner"
    ? reason
    : null;
}
