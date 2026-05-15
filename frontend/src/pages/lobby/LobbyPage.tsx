import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, logoutToLobby } from "@/features/auth";
import { landingApi } from "@/features/landing/api/landing.api";
import type {
  LandingCurrentGame,
  LandingFeaturedPreviewItem,
} from "@/features/landing/model/landing.types";
import CompletedCanvasSection from "@/features/lobby/components/CompletedCanvasSection";
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

type AuthState = "authenticated" | "guest" | "unknown";
type LobbyTab = "completed" | "rooms";
type CompletedScope = "plaza" | "public";
type CompletedPreset = "today" | "7d" | "30d";

function buildCompletedRange(preset: CompletedPreset) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (preset === "7d") {
    start.setDate(start.getDate() - 6);
  } else if (preset === "30d") {
    start.setDate(start.getDate() - 29);
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  };
}

function getErrorMessage(
  error: unknown,
  t: (key: string) => string,
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
      case "ROOM_ACTIVE_LIMIT_REACHED":
        return t("lobby.error.activeLimitReached");
      case "ROOM_ACCESS_CODE_REQUIRED":
        return t("lobby.error.accessCodeRequired");
      default:
        return message;
    }
  }

  return t("lobby.error.requestFailed");
}

export default function LobbyPage() {
  const navigate = useNavigate();
  usePageRootClass("page-shell-root");

  const { locale, setLocale, t } = useI18n();
  const [authState, setAuthState] = useState<AuthState>("unknown");
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<LobbyTab>("rooms");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [enterModalOpen, setEnterModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [enterLoading, setEnterLoading] = useState(false);
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

  const [completedScope, setCompletedScope] = useState<CompletedScope>("plaza");
  const [completedPreset, setCompletedPreset] =
    useState<CompletedPreset>("today");
  const [completedItems, setCompletedItems] = useState<
    LandingFeaturedPreviewItem[]
  >([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedError, setCompletedError] = useState<string | null>(null);

  const [plazaCurrentGame, setPlazaCurrentGame] =
    useState<LandingCurrentGame | null>(null);
  const [plazaLoading, setPlazaLoading] = useState(false);
  const [plazaError, setPlazaError] = useState<string | null>(null);

  const [roomLifecycleNoticeReason, setRoomLifecycleNoticeReason] = useState<
    "expired" | "terminated_by_owner" | null
  >(() => consumeStoredRoomLifecycleNotice());

  const {
    rooms,
    selectedRoomNumber,
    selectedRoomDetail,
    loading,
    error,
    detailLoading,
    detailError,
    loadRooms,
    loadRoomDetail,
  } = useLobbyRooms();

  const refreshAuthState = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setNickname(data.voter.nickname);
      setAuthState("authenticated");
    } catch {
      clearStoredRoomSessionContext();
      setNickname(null);
      setAuthState("guest");
    }
  }, []);

  const loadPlazaCurrentGame = useCallback(async () => {
    setPlazaLoading(true);
    setPlazaError(null);

    try {
      const { data } = await landingApi.getLandingPayload();
      setPlazaCurrentGame(data.currentGame);
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
    void Promise.resolve().then(loadPlazaCurrentGame);
  }, [loadPlazaCurrentGame]);

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
    const handleWindowFocus = () => {
      void refreshAuthState();
      void loadPlazaCurrentGame();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void refreshAuthState();
      void loadPlazaCurrentGame();
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadPlazaCurrentGame, refreshAuthState]);

  useEffect(() => {
    if (activeTab !== "completed") {
      return;
    }

    let cancelled = false;
    const { dateFrom, dateTo } = buildCompletedRange(completedPreset);

    const loadCompletedPreviews = async () => {
      setCompletedLoading(true);
      setCompletedError(null);

      try {
        const { data } = await landingApi.getCompletedPreviews({
          scope: completedScope,
          dateFrom,
          dateTo,
        });

        if (!cancelled) {
          setCompletedItems(data.items);
        }
      } catch {
        if (!cancelled) {
          setCompletedItems([]);
          setCompletedError("완성된 캔버스를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setCompletedLoading(false);
        }
      }
    };

    void loadCompletedPreviews();

    return () => {
      cancelled = true;
    };
  }, [activeTab, completedPreset, completedScope]);

  const requireLogin = useCallback(async (): Promise<boolean> => {
    if (authState === "authenticated") {
      return true;
    }

    if (authState === "unknown") {
      try {
        const { data } = await authApi.me();
        setNickname(data.voter.nickname);
        setAuthState("authenticated");
        return true;
      } catch {
        setNickname(null);
        setAuthState("guest");
      }
    }

    setLoginRequiredOpen(true);
    return false;
  }, [authState]);

  const enterRoomFromResponse = useCallback(
    (room: {
      roomId: number;
      publicRoomNumber: number;
      type: "public" | "private";
    }) => {
      setStoredRoomSessionContext(toRoomSessionContext(room));
      navigate("/room");
    },
    [navigate],
  );

  const handleParticipatePlaza = useCallback(async () => {
    if (!(await requireLogin())) {
      return;
    }

    navigate("/plaza");
  }, [navigate, requireLogin]);

  const handleCreateRoom = useCallback(async () => {
    if (!(await requireLogin())) {
      return;
    }

    setModalError(null);
    setGeneratedAccessCode(null);
    setCreatedPrivateAccessCode(null);
    setCreateModalOpen(true);
  }, [requireLogin]);

  const handleEnterRoom = useCallback(async () => {
    if (!(await requireLogin())) {
      return;
    }

    setModalError(null);
    setEnterModalOpen(true);
  }, [requireLogin]);

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
        await loadRooms();

        if (data.entered) {
          enterRoomFromResponse(data.room);
          setCreateModalOpen(false);
          return;
        }

        setGeneratedAccessCode(data.accessCode);
        setCreatedPrivateAccessCode(data.accessCode);
      } catch (error) {
        setModalError(getErrorMessage(error, t));
      } finally {
        setCreateLoading(false);
      }
    },
    [enterRoomFromResponse, loadRooms, t],
  );

  const handleEnterCreatedPrivateRoom = useCallback(async () => {
    if (!createdPrivateAccessCode) {
      return;
    }

    setCreateLoading(true);

    try {
      const { data } = await roomApi.enterPrivateRoom(createdPrivateAccessCode);
      setCreateModalOpen(false);
      setGeneratedAccessCode(null);
      enterRoomFromResponse(data.room);
    } catch (error) {
      setModalError(getErrorMessage(error, t));
    } finally {
      setCreateLoading(false);
    }
  }, [createdPrivateAccessCode, enterRoomFromResponse, t]);

  const handleCopyAccessCode = useCallback(async () => {
    if (!generatedAccessCode) {
      return;
    }

    await navigator.clipboard.writeText(generatedAccessCode);
  }, [generatedAccessCode]);

  const handleEnterPublicRoom = useCallback(
    async (publicRoomNumber: number) => {
      if (!(await requireLogin())) {
        return;
      }

      setEnterLoading(true);
      setModalError(null);

      try {
        const { data } = await roomApi.enterPublicRoom(publicRoomNumber);
        enterRoomFromResponse(data.room);
      } catch (error) {
        setModalError(getErrorMessage(error, t));
      } finally {
        setEnterLoading(false);
      }
    },
    [enterRoomFromResponse, requireLogin, t],
  );

  const handleEnterPrivateRoom = useCallback(
    async (code?: string) => {
      if (!(await requireLogin())) {
        return;
      }

      setEnterLoading(true);
      setModalError(null);

      try {
        const accessCode = (code ?? privateAccessCode).trim();
        const { data } = await roomApi.enterPrivateRoom(accessCode);
        setEnterModalOpen(false);
        setPrivateAccessCode("");
        enterRoomFromResponse(data.room);
      } catch (error) {
        setModalError(getErrorMessage(error, t));
      } finally {
        setEnterLoading(false);
      }
    },
    [enterRoomFromResponse, privateAccessCode, requireLogin, t],
  );

  const handleResolveRoomNumber = useCallback(
    async (publicRoomNumber: number): Promise<void> => {
      if (!(await requireLogin())) {
        throw new Error("LOGIN_REQUIRED");
      }

      setEnterLoading(true);
      setModalError(null);

      try {
        const { data } = await roomApi.getRoomDetail(publicRoomNumber);

        if (data.room.type === "private") {
          setModalError(t("lobby.error.privateCodePrompt"));
          return;
        }

        const entered = await roomApi.enterPublicRoom(publicRoomNumber);
        enterRoomFromResponse(entered.data.room);
        setEnterModalOpen(false);
      } catch (error) {
        setModalError(getErrorMessage(error, t));
        throw error;
      } finally {
        setEnterLoading(false);
      }
    },
    [enterRoomFromResponse, requireLogin, t],
  );

  const handleSelectRoom = useCallback(
    (publicRoomNumber: number) => {
      setPrivateAccessCode("");
      void loadRoomDetail(publicRoomNumber);
    },
    [loadRoomDetail],
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

  const handleLogout = useCallback(async () => {
    try {
      await logoutToLobby(navigate);
    } finally {
      setAuthState("guest");
      setNickname(null);
    }
  }, [navigate]);

  return (
    <main className="min-h-screen bg-[#f7f2eb] p-[10px] text-[#272E37]">
      <div className="flex justify-end">
        <div className="flex shrink-0 rounded-full border border-[#d9cdc1] bg-white p-1 shadow-[0_12px_32px_rgba(39,46,55,0.08)]">
          <button
            type="button"
            onClick={() => setLocale("ko")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              locale === "ko"
                ? "bg-[#272E37] text-white"
                : "text-[#5f6368]"
            }`}
          >
            KO
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              locale === "en"
                ? "bg-[#272E37] text-white"
                : "text-[#5f6368]"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="mt-4 grid w-full items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[32px] border border-[#e3d9cf] bg-white p-6 lg:p-8">
          <div className="flex w-full min-w-0 items-center rounded-[24px] border border-[#d9cdc1] bg-[#fbf7f2] p-2">
            {(
              [
                ["completed", t("lobby.tab.completed")],
                ["rooms", t("lobby.tab.rooms")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`rounded-[18px] px-4 py-2 text-sm font-semibold transition ${
                  activeTab === value
                    ? "bg-white text-[#272E37]"
                    : "text-[#5f6368]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {activeTab === "completed" ? (
              <CompletedCanvasSection
                scope={completedScope}
                preset={completedPreset}
                items={completedItems}
                loading={completedLoading}
                error={completedError}
                onChangeScope={setCompletedScope}
                onChangePreset={setCompletedPreset}
              />
            ) : (
              <RoomListSection
                rooms={rooms}
                selectedRoomNumber={selectedRoomNumber}
                selectedRoomDetail={selectedRoomDetail}
                loading={loading}
                error={error}
                detailLoading={detailLoading}
                detailError={detailError}
                privateAccessCode={privateAccessCode}
                onChangePrivateAccessCode={setPrivateAccessCode}
                onSelectRoom={handleSelectRoom}
                onEnterPublicRoom={handleEnterPublicRoom}
                onEnterPrivateRoom={handleEnterPrivateRoom}
              />
            )}
          </div>
        </section>

        <aside className="grid gap-4">
          <section className="rounded-[32px] border border-[#e3d9cf] bg-white p-4">
            <div className="grid gap-3">
              {authState === "authenticated" ? (
                <div className="flex min-h-[48px] items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm text-[#5f6368]">
                  <span className="truncate font-semibold text-[#272E37]">
                    {nickname ?? t("lobby.login.loggedInFallback")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void handleLogout();
                    }}
                    className="shrink-0 text-sm font-semibold text-[#e05746]"
                  >
                    로그아웃
                  </button>
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
            </div>
          </section>

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
                <div className="overflow-hidden rounded-[24px] bg-white/12 p-3">
                  <div className="overflow-hidden rounded-[20px] bg-white">
                    <img
                      src={
                        plazaCurrentGame.snapshotUrl ??
                        plazaCurrentGame.fallbackImageUrl ??
                        undefined
                      }
                      alt={t("lobby.plaza.previewAlt")}
                      className="block h-full w-full"
                      style={{ imageRendering: "pixelated" }}
                      draggable={false}
                    />
                  </div>
                </div>
                <div className="rounded-[18px] bg-white/12 px-3 py-3">
                  <div className="flex items-center text-[17px] justify-between gap-4 border-b border-white/12 py-2 first:pt-0 last:border-b-0 last:pb-0">
                    <p className=" font-semibold text-white/72">
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
                    <p className="font-semibold">
                      {plazaCurrentGame.participantCount}
                    </p>
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
        </aside>
      </div>

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
        onResolveRoomNumber={handleResolveRoomNumber}
        onEnterPrivateRoom={handleEnterPrivateRoom}
      />
    </main>
  );
}
