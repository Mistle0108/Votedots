import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTrackVisitEvent } from "@/features/analytics/hooks/use-track-visit-event";
import { trackVisitEvent } from "@/features/analytics/model/visit-event";
import { authApi, logoutToLobby } from "@/features/auth";
import {
  clearActiveGuestEntryScope,
  getActiveGuestEntryScope,
  hasGuestEntryLock,
  isSameGuestEntryScope,
  markGuestEntryLock,
  setActiveGuestEntryScope,
  type GuestEntryScope,
} from "@/features/auth/model/guest-entry";
import { landingApi } from "@/features/landing/api/landing.api";
import type { LandingCurrentGame } from "@/features/landing/model/landing.types";
import CompletedCanvasSection from "@/features/lobby/components/CompletedCanvasSection";
import GuestEntryModal from "@/features/lobby/components/GuestEntryModal";
import {
  roomApi,
  type RoomConfigProfile,
  toRoomSessionContext,
} from "@/features/room/api/room.api";
import RoomCreateModal from "@/features/room/components/RoomCreateModal";
import RoomEnterModal from "@/features/room/components/RoomEnterModal";
import RoomListSection from "@/features/room/components/RoomListSection";
import useLobbyRooms from "@/features/room/hooks/useLobbyRooms";
import { consumeStoredRoomLifecycleNotice } from "@/features/room/model/room-lifecycle-notice";
import {
  clearStoredRoomSessionContext,
  setStoredRoomSessionContext,
} from "@/features/room/model/room-session-context";
import { usePageRootClass } from "@/shared/hooks/use-page-root-class";
import { useI18n } from "@/shared/i18n";
import { translateServerMessage } from "@/shared/i18n/server-messages";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { DropdownSelect } from "@/shared/ui/dropdown-select";
import type { Voter } from "@/features/auth";

type AuthState = "authenticated" | "guest" | "unknown";
type LobbyTab = "completed" | "rooms";
type LobbyMobileTab = "plaza" | "rooms" | "completed";
type CompletedScope = "plaza" | "public";
type CompletedPreset = "today" | "7d" | "30d";
type RoomTypeFilter = "all" | "public" | "private";
type GuestEntryRequest =
  | { type: "plaza"; canvasId: number }
  | { type: "public-room"; roomId: number }
  | { type: "room-access-code"; accessCode: string };

const MOBILE_BREAKPOINT_MEDIA_QUERY = "(max-width: 767px)";
const MOBILE_ROOM_LIST_PAGE_SIZE = 5;

function getErrorMessage(
  error: unknown,
  t: (key: string) => string,
  locale: "ko" | "en",
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    const message = error.response.data.message;

    switch (message) {
      case "ROOM_EXPIRED":
        return t("lobby.error.roomExpired");
      case "ROOM_NOT_FOUND":
        return t("lobby.error.roomNotFound");
      case "ROOM_ACTIVE_LIMIT_REACHED":
        return t("lobby.error.activeLimitReached");
      case "ROOM_ACCESS_CODE_REQUIRED":
        return t("lobby.error.accessCodeRequired");
      case "AUTH_MEMBER_ONLY":
        return t("lobby.error.memberOnly");
      case "ROOM_PRIVATE_ENTRY_REQUIRES_MEMBER":
        return t("lobby.error.privateRoomMembersOnly");
      default:
        return translateServerMessage(message, t, locale);
    }
  }

  if (error instanceof Error) {
    return translateServerMessage(error.message, t, locale);
  }

  return t("lobby.error.requestFailed");
}

function buildPlazaGuestEntryScope(canvasId: number): GuestEntryScope {
  return {
    kind: "plaza",
    canvasId,
  };
}

function buildRoomGuestEntryScope(roomId: number): GuestEntryScope {
  return {
    kind: "room",
    roomId,
  };
}

export default function LobbyPage() {
  const navigate = useNavigate();
  usePageRootClass("page-shell-root");
  useTrackVisitEvent("lobby_visit");

  const { locale, setLocale, t } = useI18n();
  const [authState, setAuthState] = useState<AuthState>("unknown");
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);
  const [currentVoter, setCurrentVoter] = useState<Voter | null>(null);

  const [activeTab, setActiveTab] = useState<LobbyTab>("rooms");
  const [mobileTab, setMobileTab] = useState<LobbyMobileTab>("plaza");
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
      ? false
      : window.matchMedia(MOBILE_BREAKPOINT_MEDIA_QUERY).matches,
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [enterModalOpen, setEnterModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [enterLoading, setEnterLoading] = useState(false);
  const [guestEntryModalOpen, setGuestEntryModalOpen] = useState(false);
  const [guestEntryLoading, setGuestEntryLoading] = useState(false);
  const [guestEntryBlocked, setGuestEntryBlocked] = useState(false);
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomTypeFilter>("all");
  const [mobileRoomPage, setMobileRoomPage] = useState(1);
  const [mobileRoomDetailOpen, setMobileRoomDetailOpen] = useState(false);
  const [generatedAccessCode, setGeneratedAccessCode] = useState<string | null>(
    null,
  );
  const [roomConfigProfiles, setRoomConfigProfiles] = useState<RoomConfigProfile[]>(
    [],
  );
  const [createdPrivateAccessCode, setCreatedPrivateAccessCode] = useState<
    string | null
  >(null);
  const [privateAccessCode, setPrivateAccessCode] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [guestEntryError, setGuestEntryError] = useState<string | null>(null);
  const [pendingGuestEntry, setPendingGuestEntry] =
    useState<GuestEntryRequest | null>(null);

  const [completedScope, setCompletedScope] = useState<CompletedScope>("plaza");
  const [completedPreset, setCompletedPreset] =
    useState<CompletedPreset>("today");
  const [hasLoadedPlaza, setHasLoadedPlaza] = useState(false);
  const [roomsNeedRefresh, setRoomsNeedRefresh] = useState(false);

  const [plazaCurrentGame, setPlazaCurrentGame] =
    useState<LandingCurrentGame | null>(null);
  const [plazaLoading, setPlazaLoading] = useState(false);
  const [plazaError, setPlazaError] = useState<string | null>(null);

  const [roomLifecycleNoticeReason, setRoomLifecycleNoticeReason] = useState<
    "expired" | "terminated_by_owner" | null
  >(() => consumeStoredRoomLifecycleNotice());
  const rightPanelRef = useRef<HTMLElement | null>(null);
  const [leftPanelHeight, setLeftPanelHeight] = useState<number | null>(null);

  const {
    rooms,
    selectedRoomId,
    selectedRoomDetail,
    hasLoadedOnce: hasLoadedRooms,
    loading,
    error,
    detailLoading,
    detailError,
    loadRooms,
    loadRoomDetail,
    clearSelectedRoomDetail,
  } = useLobbyRooms();

  const isPlazaVisible = !isMobileLayout || mobileTab === "plaza";
  const isRoomsVisible = isMobileLayout
    ? mobileTab === "rooms"
    : activeTab === "rooms";
  const isCompletedVisible = isMobileLayout
    ? mobileTab === "completed"
    : activeTab === "completed";

  const filteredRooms = useMemo(() => {
    if (roomTypeFilter === "all") {
      return rooms;
    }

    return rooms.filter((room) => room.type === roomTypeFilter);
  }, [roomTypeFilter, rooms]);

  const mobileRoomTotalPages = Math.max(
    1,
    Math.ceil(filteredRooms.length / MOBILE_ROOM_LIST_PAGE_SIZE),
  );
  const resolvedMobileRoomPage = Math.min(mobileRoomPage, mobileRoomTotalPages);
  const mobilePagedRooms = useMemo(() => {
    const startIndex =
      (resolvedMobileRoomPage - 1) * MOBILE_ROOM_LIST_PAGE_SIZE;
    return filteredRooms.slice(
      startIndex,
      startIndex + MOBILE_ROOM_LIST_PAGE_SIZE,
    );
  }, [filteredRooms, resolvedMobileRoomPage]);

  const refreshAuthState = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setCurrentVoter(data.voter);
      if (data.voter.isGuest) {
        setAuthState("guest");
        return;
      }

      clearActiveGuestEntryScope();
      setAuthState("authenticated");
    } catch {
      clearStoredRoomSessionContext();
      clearActiveGuestEntryScope();
      setCurrentVoter(null);
      setAuthState("guest");
    }
  }, []);

  const loadPlazaCurrentGame = useCallback(async () => {
    setPlazaLoading(true);
    setPlazaError(null);

    try {
      const { data } = await landingApi.getLandingPayload();
      setPlazaCurrentGame(data.currentGame);
      setHasLoadedPlaza(true);
    } catch {
      setPlazaCurrentGame(null);
      setPlazaError(t("lobby.plaza.loadFailed"));
    } finally {
      setPlazaLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void Promise.resolve().then(refreshAuthState);
  }, [refreshAuthState]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileLayout(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isPlazaVisible || hasLoadedPlaza) {
      return;
    }

    void Promise.resolve().then(loadPlazaCurrentGame);
  }, [hasLoadedPlaza, isPlazaVisible, loadPlazaCurrentGame]);

  useEffect(() => {
    let cancelled = false;

    void roomApi
      .getConfigProfiles()
      .then(({ data }) => {
        if (!cancelled) {
          setRoomConfigProfiles(data.profiles);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoomConfigProfiles([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authState === "unknown" || !isRoomsVisible) {
      return;
    }

    if (hasLoadedRooms && !roomsNeedRefresh) {
      return;
    }

    void (async () => {
      const nextRooms = await loadRooms({ silent: hasLoadedRooms });

      if (nextRooms !== null) {
        setRoomsNeedRefresh(false);
      }
    })();
  }, [
    authState,
    hasLoadedRooms,
    isRoomsVisible,
    loadRooms,
    roomsNeedRefresh,
  ]);

  useEffect(() => {
    if (!isRoomsVisible || filteredRooms.length === 0 || selectedRoomId !== null) {
      return;
    }

    void loadRoomDetail(filteredRooms[0].roomId);
  }, [filteredRooms, isRoomsVisible, loadRoomDetail, selectedRoomId]);

  useEffect(() => {
    if (!isRoomsVisible || selectedRoomId === null) {
      return;
    }

    if (filteredRooms.some((room) => room.roomId === selectedRoomId)) {
      return;
    }

    if (filteredRooms.length > 0) {
      void loadRoomDetail(filteredRooms[0].roomId);
      return;
    }

    clearSelectedRoomDetail();
  }, [
    clearSelectedRoomDetail,
    filteredRooms,
    isRoomsVisible,
    loadRoomDetail,
    selectedRoomId,
  ]);

  useEffect(() => {
    const element = rightPanelRef.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateHeight = () => {
      setLeftPanelHeight(element.offsetHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [activeTab, authState, plazaCurrentGame, plazaLoading, plazaError]);

  const ensureMemberSession = useCallback(async (): Promise<boolean> => {
    if (authState === "authenticated" && currentVoter && !currentVoter.isGuest) {
      return true;
    }

    if (authState === "unknown") {
      try {
        const { data } = await authApi.me();
        setCurrentVoter(data.voter);

        if (!data.voter.isGuest) {
          clearActiveGuestEntryScope();
          setAuthState("authenticated");
          return true;
        }

        setAuthState("guest");
      } catch {
        clearActiveGuestEntryScope();
        setCurrentVoter(null);
        setAuthState("guest");
      }
    }

    setLoginRequiredOpen(true);
    return false;
  }, [authState, currentVoter]);

  const syncSessionState = useCallback(async () => {
    if (authState === "authenticated" && currentVoter && !currentVoter.isGuest) {
      return { kind: "member" as const, voter: currentVoter };
    }

    if (authState === "guest") {
      return {
        kind: "guest" as const,
        voter: currentVoter?.isGuest ? currentVoter : null,
      };
    }

    try {
      const { data } = await authApi.me();
      setCurrentVoter(data.voter);

      if (data.voter.isGuest) {
        setAuthState("guest");
        return { kind: "guest" as const, voter: data.voter };
      }

      clearActiveGuestEntryScope();
      setAuthState("authenticated");
      return { kind: "member" as const, voter: data.voter };
    } catch {
      clearActiveGuestEntryScope();
      setCurrentVoter(null);
      setAuthState("guest");
      return { kind: "guest" as const, voter: null };
    }
  }, [authState, currentVoter]);

  const resolveGuestScopeLabel = useCallback(
    (scope: GuestEntryScope) =>
      scope.kind === "plaza"
        ? t("lobby.guestEntry.scope.plaza")
        : t("lobby.guestEntry.scope.publicRoom"),
    [t],
  );

  const buildGuestReentryBlockedMessage = useCallback(
    (scope: GuestEntryScope) =>
      t("lobby.guestEntry.reentryBlocked", {
        scope: resolveGuestScopeLabel(scope),
      }),
    [resolveGuestScopeLabel, t],
  );

  const getKnownGuestEntryScope = useCallback(
    (request: GuestEntryRequest): GuestEntryScope | null => {
      switch (request.type) {
        case "plaza":
          return buildPlazaGuestEntryScope(request.canvasId);
        case "public-room":
          return buildRoomGuestEntryScope(request.roomId);
        case "room-access-code":
          return null;
      }
    },
    [],
  );

  const openGuestEntryModal = useCallback(
    (request: GuestEntryRequest, options?: { blocked?: boolean; error?: string | null }) => {
      setPendingGuestEntry(request);
      setGuestEntryBlocked(Boolean(options?.blocked));
      setGuestEntryError(options?.error ?? null);
      setGuestEntryModalOpen(true);
    },
    [],
  );

  const closeGuestEntryModal = useCallback(() => {
    setGuestEntryModalOpen(false);
    setGuestEntryLoading(false);
    setGuestEntryBlocked(false);
    setGuestEntryError(null);
    setPendingGuestEntry(null);
  }, []);

  const enterRoomFromResponse = useCallback(
    (room: {
      roomId: number;
      type: "public" | "private";
    }) => {
      setStoredRoomSessionContext(toRoomSessionContext(room));
      navigate("/room");
    },
    [navigate],
  );

  const enterRoomByAccessCodeWithCurrentSession = useCallback(
    async (accessCode: string) => {
      const { data } = await roomApi.enterRoom(accessCode);
      return data.room;
    },
    [],
  );

  const enterPublicRoomWithCurrentSession = useCallback(
    async (roomId: number) => {
      const { data } = await roomApi.enterPublicRoomById(roomId);
      return data.room;
    },
    [],
  );

  const completeGuestEntryForScope = useCallback((scope: GuestEntryScope) => {
    markGuestEntryLock(scope);
    setActiveGuestEntryScope(scope);
  }, []);

  const handleSubmitGuestEntry = useCallback(
    async (nickname: string) => {
      if (!pendingGuestEntry) {
        return;
      }

      setGuestEntryLoading(true);
      setGuestEntryError(null);
      setGuestEntryBlocked(false);

      const knownScope = getKnownGuestEntryScope(pendingGuestEntry);

      if (knownScope && hasGuestEntryLock(knownScope)) {
        setGuestEntryBlocked(true);
        setGuestEntryError(buildGuestReentryBlockedMessage(knownScope));
        setGuestEntryLoading(false);
        return;
      }

      let createdGuestSession = false;

      try {
        if (currentVoter?.isGuest) {
          try {
            await authApi.logout();
          } catch {
            // Best effort: the next guest-session request will fail if the old session remains.
          }

          clearActiveGuestEntryScope();
          clearStoredRoomSessionContext();
          setCurrentVoter(null);
          setAuthState("guest");
        }

        const { data: guestData } = await authApi.createGuestSession({ nickname });
        createdGuestSession = true;
        setCurrentVoter(guestData.voter);
        setAuthState("guest");

        if (pendingGuestEntry.type === "plaza") {
          const scope = buildPlazaGuestEntryScope(pendingGuestEntry.canvasId);
          completeGuestEntryForScope(scope);
          closeGuestEntryModal();
          navigate("/plaza");
          return;
        }

        if (pendingGuestEntry.type === "public-room") {
          const scope = buildRoomGuestEntryScope(pendingGuestEntry.roomId);
          const room = await enterPublicRoomWithCurrentSession(pendingGuestEntry.roomId);
          completeGuestEntryForScope(scope);
          closeGuestEntryModal();
          enterRoomFromResponse(room);
          return;
        }

        const room = await enterRoomByAccessCodeWithCurrentSession(
          pendingGuestEntry.accessCode,
        );

        if (room.type !== "public") {
          throw new Error("ROOM_PRIVATE_ENTRY_REQUIRES_MEMBER");
        }

        const scope = buildRoomGuestEntryScope(room.roomId);

        if (hasGuestEntryLock(scope)) {
          if (createdGuestSession) {
            try {
              await authApi.logout();
            } catch {
              // Ignore logout failure and keep the UI in a blocked state.
            }
          }

          clearActiveGuestEntryScope();
          clearStoredRoomSessionContext();
          setCurrentVoter(null);
          setAuthState("guest");
          setGuestEntryBlocked(true);
          setGuestEntryError(buildGuestReentryBlockedMessage(scope));
          return;
        }

        completeGuestEntryForScope(scope);
        closeGuestEntryModal();
        enterRoomFromResponse(room);
      } catch (error) {
        if (createdGuestSession) {
          try {
            await authApi.logout();
          } catch {
            // Ignore logout failure so the user can still see the translated error.
          }

          clearActiveGuestEntryScope();
          clearStoredRoomSessionContext();
          setCurrentVoter(null);
          setAuthState("guest");
        }

        const message = getErrorMessage(error, t, locale);
        setGuestEntryError(message);
      } finally {
        setGuestEntryLoading(false);
      }
    },
    [
      buildGuestReentryBlockedMessage,
      closeGuestEntryModal,
      completeGuestEntryForScope,
      currentVoter,
      enterPublicRoomWithCurrentSession,
      enterRoomByAccessCodeWithCurrentSession,
      enterRoomFromResponse,
      getKnownGuestEntryScope,
      locale,
      navigate,
      pendingGuestEntry,
      t,
    ],
  );

  const handleParticipatePlaza = useCallback(async () => {
    if (!plazaCurrentGame) {
      setPlazaError(t("lobby.plaza.empty"));
      return;
    }

    const sessionState = await syncSessionState();
    const scope = buildPlazaGuestEntryScope(plazaCurrentGame.canvasId);
    const activeGuestScope = getActiveGuestEntryScope();

    if (sessionState.kind === "member") {
      navigate("/plaza");
      return;
    }

    if (
      sessionState.voter?.isGuest &&
      isSameGuestEntryScope(activeGuestScope, scope)
    ) {
      navigate("/plaza");
      return;
    }

    if (hasGuestEntryLock(scope)) {
      openGuestEntryModal(
        { type: "plaza", canvasId: plazaCurrentGame.canvasId },
        {
          blocked: true,
          error: buildGuestReentryBlockedMessage(scope),
        },
      );
      return;
    }

    openGuestEntryModal({ type: "plaza", canvasId: plazaCurrentGame.canvasId });
  }, [
    buildGuestReentryBlockedMessage,
    navigate,
    openGuestEntryModal,
    plazaCurrentGame,
    syncSessionState,
    t,
  ]);

  const handleCreateRoom = useCallback(async () => {
    if (!(await ensureMemberSession())) {
      return;
    }

    setModalError(null);
    setGeneratedAccessCode(null);
    setCreatedPrivateAccessCode(null);
    setCreateModalOpen(true);
  }, [ensureMemberSession]);

  const handleEnterRoom = useCallback(async () => {
    setModalError(null);
    setEnterModalOpen(true);
  }, []);

  const handleSubmitCreateRoom = useCallback(
    async (payload: {
      title: string;
      type: "public" | "private";
      profileKey: string;
      introPhaseSec: number;
      totalRounds: number;
      votesPerRound: number;
    }) => {
      setCreateLoading(true);
      setModalError(null);

      try {
        const { data } = await roomApi.createRoom(payload);
        void trackVisitEvent(
          payload.type === "public"
            ? "public_room_created"
            : "private_room_created",
        ).catch(() => {});

        if (data.entered) {
          enterRoomFromResponse(data.room);
          setCreateModalOpen(false);
          return;
        }

        if (isRoomsVisible) {
          const nextRooms = await loadRooms({ silent: hasLoadedRooms });
          setRoomsNeedRefresh(nextRooms === null);
        } else {
          setRoomsNeedRefresh(true);
        }

        setGeneratedAccessCode(data.accessCode);
        setCreatedPrivateAccessCode(data.accessCode);
      } catch (error) {
        setModalError(getErrorMessage(error, t, locale));
      } finally {
        setCreateLoading(false);
      }
    },
    [
      enterRoomFromResponse,
      hasLoadedRooms,
      isRoomsVisible,
      loadRooms,
      locale,
      t,
    ],
  );

  const handleEnterCreatedPrivateRoom = useCallback(async () => {
    if (!createdPrivateAccessCode) {
      return;
    }

    setCreateLoading(true);

    try {
      const { data } = await roomApi.enterRoom(createdPrivateAccessCode);
      setCreateModalOpen(false);
      setGeneratedAccessCode(null);
      enterRoomFromResponse(data.room);
    } catch (error) {
      setModalError(getErrorMessage(error, t, locale));
    } finally {
      setCreateLoading(false);
    }
  }, [createdPrivateAccessCode, enterRoomFromResponse, locale, t]);

  const handleCopyAccessCode = useCallback(async () => {
    if (!generatedAccessCode) {
      return;
    }

    await navigator.clipboard.writeText(generatedAccessCode);
  }, [generatedAccessCode]);

  const handleEnterRoomByAccessCode = useCallback(
    async (code?: string) => {
      setModalError(null);
      const accessCode = (code ?? privateAccessCode).trim().toUpperCase();
      const sessionState = await syncSessionState();

      if (!accessCode) {
        setModalError(t("lobby.error.accessCodeRequired"));
        return;
      }

      if (sessionState.kind === "member") {
        setEnterLoading(true);

        try {
          const room = await enterRoomByAccessCodeWithCurrentSession(accessCode);
          setEnterModalOpen(false);
          setPrivateAccessCode("");
          enterRoomFromResponse(room);
        } catch (error) {
          setModalError(getErrorMessage(error, t, locale));
        } finally {
          setEnterLoading(false);
        }

        return;
      }

      setEnterModalOpen(false);
      setPrivateAccessCode("");
      openGuestEntryModal({
        type: "room-access-code",
        accessCode,
      });
    },
    [
      enterRoomByAccessCodeWithCurrentSession,
      enterRoomFromResponse,
      locale,
      openGuestEntryModal,
      privateAccessCode,
      syncSessionState,
      t,
    ],
  );

  const handleEnterPublicRoom = useCallback(
    async (roomId: number) => {
      const sessionState = await syncSessionState();
      const scope = buildRoomGuestEntryScope(roomId);
      const activeGuestScope = getActiveGuestEntryScope();

      if (sessionState.kind === "member") {
        setEnterLoading(true);
        setModalError(null);

        try {
          const room = await enterPublicRoomWithCurrentSession(roomId);
          enterRoomFromResponse(room);
        } catch (error) {
          setModalError(getErrorMessage(error, t, locale));
        } finally {
          setEnterLoading(false);
        }

        return;
      }

      if (
        sessionState.voter?.isGuest &&
        isSameGuestEntryScope(activeGuestScope, scope)
      ) {
        setEnterLoading(true);
        setModalError(null);

        try {
          const room = await enterPublicRoomWithCurrentSession(roomId);
          enterRoomFromResponse(room);
        } catch (error) {
          setModalError(getErrorMessage(error, t, locale));
        } finally {
          setEnterLoading(false);
        }

        return;
      }

      if (hasGuestEntryLock(scope)) {
        openGuestEntryModal(
          { type: "public-room", roomId },
          {
            blocked: true,
            error: buildGuestReentryBlockedMessage(scope),
          },
        );
        return;
      }

      openGuestEntryModal({ type: "public-room", roomId });
    },
    [
      buildGuestReentryBlockedMessage,
      enterPublicRoomWithCurrentSession,
      enterRoomFromResponse,
      locale,
      openGuestEntryModal,
      syncSessionState,
      t,
    ],
  );

  const handleSelectRoom = useCallback(
    (roomId: number) => {
      setPrivateAccessCode("");
      if (isMobileLayout) {
        setMobileRoomDetailOpen(true);
      }
      void loadRoomDetail(roomId);
    },
    [isMobileLayout, loadRoomDetail],
  );

  const handleCloseCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setModalError(null);
    setGeneratedAccessCode(null);
    setCreatedPrivateAccessCode(null);
  }, []);

  const handleCloseEnterModal = useCallback(() => {
    setEnterModalOpen(false);
    setModalError(null);
  }, []);

  const handleCloseGuestEntryModal = useCallback(() => {
    closeGuestEntryModal();
  }, [closeGuestEntryModal]);

  const handleChangeRoomTypeFilter = useCallback((nextValue: RoomTypeFilter) => {
    setRoomTypeFilter(nextValue);
    setMobileRoomPage(1);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logoutToLobby(navigate);
    } finally {
      setAuthState("guest");
      setCurrentVoter(null);
    }
  }, [navigate]);

  const accountPanel = (
    <section className="rounded-[32px] border border-[#e3d9cf] bg-white p-4">
      <div className="grid gap-3">
        {authState === "authenticated" && currentVoter && !currentVoter.isGuest ? (
          <div className="grid gap-5 rounded-2xl px-2 py-2 text-sm text-[#5f6368]">
            <div className="min-w-0 px-2 py-1 text-left">
              <p className="truncate text-[18px] font-semibold tracking-[-0.03em] text-[#272E37]">
                {currentVoter?.nickname ?? t("lobby.login.loggedInFallback")}
              </p>
              <p className="mt-2 truncate text-[15px] font-medium text-[#7b6b62]">
                @{currentVoter?.username ?? ""}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  navigate("/mypage");
                }}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#d9cdc1] bg-white px-4 text-xs font-semibold text-[#272E37] transition hover:bg-[#f7f2eb]"
              >
                {t("lobby.actions.mypage")}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#d9cdc1] bg-white px-4 text-xs font-semibold text-[#272E37] transition hover:bg-[#f7f2eb]"
              >
                {t("session.logout")}
              </button>
            </div>
          </div>
        ) : currentVoter?.isGuest ? (
          <div className="grid gap-5 rounded-2xl px-2 py-2 text-sm text-[#5f6368]">
            <div className="min-w-0 px-2 py-1 text-left">
              <div className="flex items-center gap-2">
                <p className="truncate text-[18px] font-semibold tracking-[-0.03em] text-[#272E37]">
                  {currentVoter.nickname}
                </p>
                <span className="rounded-full bg-[#272E37] px-2.5 py-1 text-[11px] font-semibold text-white">
                  {t("lobby.account.guestBadge")}
                </span>
              </div>
              <p className="mt-2 text-[14px] leading-6 text-[#7b6b62]">
                {t("lobby.account.guestDescription")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  navigate("/login");
                }}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#d9cdc1] bg-white px-4 text-xs font-semibold text-[#272E37] transition hover:bg-[#f7f2eb]"
              >
                {t("auth.login.submit")}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#d9cdc1] bg-white px-4 text-xs font-semibold text-[#272E37] transition hover:bg-[#f7f2eb]"
              >
                {t("session.logout")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              navigate("/login");
            }}
            className="min-h-[48px] w-full rounded-2xl border border-[#f26b5d] px-4 py-3 text-sm font-semibold text-[#e05746]"
          >
            {t("auth.login.submit")}
          </button>
        )}
      </div>
    </section>
  );

  const roomActionButtons = (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={handleCreateRoom}
        className="rounded-2xl border border-[#d9cdc1] px-4 py-3 text-sm font-semibold text-[#272E37]"
      >
        {t("lobby.actions.createRoom")}
      </button>
      <button
        type="button"
        onClick={handleEnterRoom}
        className="rounded-2xl border border-[#d9cdc1] px-4 py-3 text-sm font-semibold text-[#272E37]"
      >
        {t("lobby.actions.enterRoom")}
      </button>
    </div>
  );

  const plazaPanel = (
    <section className="rounded-[32px] border border-[#e3d9cf] bg-[#ff8870] p-6 text-white">
      <p className="text-center text-base font-semibold tracking-[0.18em] text-white/72">
        {t("lobby.plaza.label")}
      </p>
      {plazaLoading ? (
        <p className="mt-3 text-sm leading-6 text-white/88">
          {t("lobby.plaza.loading")}
        </p>
      ) : plazaError ? (
        <p className="mt-3 text-sm leading-6 text-white/88">{plazaError}</p>
      ) : plazaCurrentGame ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-[24px] bg-white/12 p-3">
            <div className="overflow-auto rounded-[20px] bg-white">
              <img
                src={
                  plazaCurrentGame.snapshotUrl ??
                  plazaCurrentGame.fallbackImageUrl ??
                  undefined
                }
                alt={t("lobby.plaza.previewAlt")}
                className="mx-auto block h-[256px] w-[256px]"
                style={{ imageRendering: "pixelated" }}
                width={256}
                height={256}
                draggable={false}
              />
            </div>
          </div>
          <div className="rounded-[18px] bg-white/12 px-3 py-3">
            <div className="flex items-center text-[17px] justify-between gap-4 border-b border-white/12 py-2 first:pt-0 last:border-b-0 last:pb-0">
              <p className="font-semibold text-white/72">
                {t("lobby.plaza.stats.grid")}
              </p>
              <p className="font-semibold">
                {plazaCurrentGame.gridX} x {plazaCurrentGame.gridY}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/12 py-2 first:pt-0 last:border-b-0 last:pb-0">
              <p className="font-semibold text-white/72">
                {t("lobby.plaza.stats.round")}
              </p>
              <p className="font-semibold">
                {plazaCurrentGame.currentRoundNumber} /{" "}
                {plazaCurrentGame.totalRounds}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
              <p className="font-semibold text-white/72">
                {t("lobby.plaza.stats.participants")}
              </p>
              <p className="font-semibold">{plazaCurrentGame.participantCount}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-white/88">
          {t("lobby.plaza.empty")}
        </p>
      )}
      <button
        type="button"
        onClick={handleParticipatePlaza}
        className="mt-5 w-full rounded-2xl bg-[#272E37] px-4 py-3 text-center text-sm font-semibold text-white"
      >
        {t("lobby.actions.joinPlaza")}
      </button>
    </section>
  );

  return (
    <main
      className="min-h-screen bg-[#f7f2eb] p-[10px] text-[#272E37]"
      style={{ colorScheme: "light" }}
    >
      <div className="flex items-center justify-between gap-3">
        <BrandLogo variant="wordmark" className="w-30 sm:w-34" />

        <div className="flex shrink-0 rounded-full border border-[#d9cdc1] bg-white p-1 shadow-[0_12px_32px_rgba(39,46,55,0.08)]">
          <button
            type="button"
            onClick={() => setLocale("ko")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${locale === "ko"
                ? "bg-[#272E37] text-white"
                : "text-[#5f6368]"
              }`}
          >
            KO
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${locale === "en"
                ? "bg-[#272E37] text-white"
                : "text-[#5f6368]"
              }`}
          >
            EN
          </button>
        </div>
      </div>

      {isMobileLayout ? (
        <div className="mt-4 space-y-4">
          {accountPanel}

          <section className="rounded-[32px] border border-[#e3d9cf] bg-white p-5">
            <div className="flex w-full min-w-0 items-center rounded-[24px] border border-[#d9cdc1] bg-[#fbf7f2] p-2">
              {(
                [
                  ["plaza", t("lobby.tab.plaza")],
                  ["rooms", t("lobby.tab.rooms")],
                  ["completed", t("lobby.tab.completed")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMobileTab(value);
                    setMobileRoomDetailOpen(false);
                  }}
                  className={`rounded-[18px] px-4 py-2 text-sm font-semibold transition ${mobileTab === value
                      ? "bg-white text-[#272E37]"
                      : "text-[#5f6368]"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              <div className={mobileTab === "plaza" ? "" : "hidden"}>
                {plazaPanel}
              </div>

              <div className={mobileTab === "rooms" ? "space-y-4" : "hidden"}>
                  {roomActionButtons}
                  <div className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-sm font-semibold text-[#6c5a4d]">
                      {t("lobby.roomList.filter.typeLabel")}
                    </span>
                    <DropdownSelect
                      value={roomTypeFilter}
                      onChange={handleChangeRoomTypeFilter}
                      options={[
                        { value: "all", label: t("lobby.roomList.filter.all") },
                        {
                          value: "public",
                          label: t("lobby.roomList.filter.public"),
                        },
                        {
                          value: "private",
                          label: t("lobby.roomList.filter.private"),
                        },
                      ]}
                      className="w-full"
                      triggerClassName="h-11 rounded-full border border-[#d9cdc1] bg-white px-4 text-sm font-semibold text-[#2d2d2d]"
                    />
                  </div>

                  <RoomListSection
                    rooms={mobilePagedRooms}
                    selectedRoomId={selectedRoomId}
                    selectedRoomDetail={selectedRoomDetail}
                    loading={loading}
                    error={error}
                    detailLoading={detailLoading}
                    detailError={detailError}
                    privateAccessCode={privateAccessCode}
                    onChangePrivateAccessCode={setPrivateAccessCode}
                    onSelectRoom={handleSelectRoom}
                    onEnterPublicRoom={handleEnterPublicRoom}
                    onEnterPrivateRoom={handleEnterRoomByAccessCode}
                    mobileMode
                    page={resolvedMobileRoomPage}
                    totalPages={mobileRoomTotalPages}
                    onChangePage={setMobileRoomPage}
                    mobileDetailOpen={mobileRoomDetailOpen}
                    onCloseMobileDetail={() => setMobileRoomDetailOpen(false)}
                  />
              </div>

              <div className={mobileTab === "completed" ? "" : "hidden"}>
                <CompletedCanvasSection
                  scope={completedScope}
                  preset={completedPreset}
                  onChangeScope={setCompletedScope}
                  onChangePreset={setCompletedPreset}
                  mobileMode
                  active={isCompletedVisible}
                />
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-4 grid w-full items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <section
            className="order-2 flex min-h-0 flex-col rounded-[32px] border border-[#e3d9cf] bg-white p-6 xl:order-1 lg:p-8"
            style={
              activeTab === "rooms" && leftPanelHeight
                ? { height: `${leftPanelHeight}px` }
                : undefined
            }
          >
            <div className="flex w-full min-w-0 items-center rounded-[24px] border border-[#d9cdc1] bg-[#fbf7f2] p-2">
              {(
                [
                  ["rooms", t("lobby.tab.rooms")],
                  ["completed", t("lobby.tab.completed")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value)}
                  className={`rounded-[18px] px-4 py-2 text-sm font-semibold transition ${activeTab === value
                      ? "bg-white text-[#272E37]"
                      : "text-[#5f6368]"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "rooms" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    ["all", t("lobby.roomList.filter.all")],
                    ["public", t("lobby.roomList.filter.public")],
                    ["private", t("lobby.roomList.filter.private")],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleChangeRoomTypeFilter(value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${roomTypeFilter === value
                        ? "bg-[#272E37] text-white"
                        : "border border-[#d9cdc1] bg-white text-[#5f6368]"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-5 min-h-0 flex-1">
              <div className={activeTab === "rooms" ? "h-full" : "hidden"}>
                <RoomListSection
                  rooms={filteredRooms}
                  selectedRoomId={selectedRoomId}
                  selectedRoomDetail={selectedRoomDetail}
                  loading={loading}
                  error={error}
                  detailLoading={detailLoading}
                  detailError={detailError}
                  privateAccessCode={privateAccessCode}
                  onChangePrivateAccessCode={setPrivateAccessCode}
                  onSelectRoom={handleSelectRoom}
                  onEnterPublicRoom={handleEnterPublicRoom}
                  onEnterPrivateRoom={handleEnterRoomByAccessCode}
                />
              </div>

              <div className={activeTab === "completed" ? "h-full" : "hidden"}>
                <CompletedCanvasSection
                  scope={completedScope}
                  preset={completedPreset}
                  onChangeScope={setCompletedScope}
                  onChangePreset={setCompletedPreset}
                  active={isCompletedVisible}
                />
              </div>
            </div>
          </section>

          <aside ref={rightPanelRef} className="order-1 grid gap-4 xl:order-2">
            {accountPanel}
            <section className="rounded-[32px] border border-[#e3d9cf] bg-white p-4">
              {roomActionButtons}
            </section>
            {plazaPanel}
          </aside>
        </div>
      )}

      {loginRequiredOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-7 shadow-[0_30px_100px_rgba(39,46,55,0.28)]">
            <h2 className="text-xl font-semibold text-[#272E37]">
              {t("server.auth.requiredLogin")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#5f6368]">
              {t("lobby.loginRequired.description")}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setLoginRequiredOpen(false)}
                className="flex-1 rounded-2xl border border-[#d9cdc1] px-4 py-3 text-sm font-semibold text-[#272E37]"
              >
                {t("common.confirm")}
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex-1 rounded-2xl bg-[#272E37] px-4 py-3 text-sm font-semibold text-white"
              >
                {t("auth.login.submit")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {roomLifecycleNoticeReason ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-7 shadow-[0_30px_100px_rgba(39,46,55,0.28)]">
            <h2 className="text-xl font-semibold text-[#272E37]">
              {roomLifecycleNoticeReason === "terminated_by_owner"
                ? t("lobby.notice.roomTerminated")
                : t("lobby.notice.roomExpired")}
            </h2>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setRoomLifecycleNoticeReason(null)}
                className="rounded-2xl bg-[#272E37] px-4 py-3 text-sm font-semibold text-white"
              >
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <RoomCreateModal
        open={createModalOpen}
        loading={createLoading}
        error={modalError}
        generatedAccessCode={generatedAccessCode}
        profiles={roomConfigProfiles}
        onClose={handleCloseCreateModal}
        onCopyAccessCode={handleCopyAccessCode}
        onEnterCreatedPrivateRoom={handleEnterCreatedPrivateRoom}
        onSubmit={handleSubmitCreateRoom}
      />

      <RoomEnterModal
        open={enterModalOpen}
        loading={enterLoading}
        error={modalError}
        onClose={handleCloseEnterModal}
        onEnterRoom={handleEnterRoomByAccessCode}
      />

      <GuestEntryModal
        open={guestEntryModalOpen}
        loading={guestEntryLoading}
        blocked={guestEntryBlocked}
        error={guestEntryError}
        scopeLabel={
          pendingGuestEntry?.type === "plaza"
            ? t("lobby.guestEntry.scope.plaza")
            : pendingGuestEntry?.type === "public-room"
              ? t("lobby.guestEntry.scope.publicRoom")
              : t("lobby.guestEntry.scope.room")
        }
        onClose={handleCloseGuestEntryModal}
        onSubmit={handleSubmitGuestEntry}
      />
    </main>
  );
}
