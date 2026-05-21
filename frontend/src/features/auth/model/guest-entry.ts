const ACTIVE_GUEST_ENTRY_SCOPE_KEY = "votedots:guest-active-scope";

export type GuestEntryScope =
  | {
      kind: "plaza";
      canvasId: number;
    }
  | {
      kind: "room";
      roomId: number;
    };

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getActiveGuestEntryScope(): GuestEntryScope | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(ACTIVE_GUEST_ENTRY_SCOPE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GuestEntryScope>;

    if (parsed.kind === "plaza" && typeof parsed.canvasId === "number") {
      return {
        kind: "plaza",
        canvasId: parsed.canvasId,
      };
    }

    if (parsed.kind === "room" && typeof parsed.roomId === "number") {
      return {
        kind: "room",
        roomId: parsed.roomId,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function setActiveGuestEntryScope(scope: GuestEntryScope | null): void {
  if (!canUseStorage()) {
    return;
  }

  if (!scope) {
    window.localStorage.removeItem(ACTIVE_GUEST_ENTRY_SCOPE_KEY);
    return;
  }

  window.localStorage.setItem(
    ACTIVE_GUEST_ENTRY_SCOPE_KEY,
    JSON.stringify(scope),
  );
}

export function clearActiveGuestEntryScope(): void {
  setActiveGuestEntryScope(null);
}

export function isSameGuestEntryScope(
  left: GuestEntryScope | null,
  right: GuestEntryScope | null,
): boolean {
  if (!left || !right || left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "plaza" && right.kind === "plaza") {
    return left.canvasId === right.canvasId;
  }

  if (left.kind === "room" && right.kind === "room") {
    return left.roomId === right.roomId;
  }

  return false;
}
