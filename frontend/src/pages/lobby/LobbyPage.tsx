import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, logoutToLobby } from "@/features/auth";
import {
  roomApi,
  toRoomSessionContext,
} from "@/features/room/api/room.api";
import RoomCreateModal from "@/features/room/components/RoomCreateModal";
import RoomEnterModal from "@/features/room/components/RoomEnterModal";
import RoomListSection from "@/features/room/components/RoomListSection";
import useLobbyRooms from "@/features/room/hooks/useLobbyRooms";
import {
  clearStoredRoomSessionContext,
  setStoredRoomSessionContext,
} from "@/features/room/model/room-session-context";

type AuthState = "authenticated" | "guest" | "unknown";
type LobbyTab = "completed" | "rooms";

function getErrorMessage(error: unknown): string {
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
        return "현재 만료된 방입니다.";
      case "ROOM_ACTIVE_LIMIT_REACHED":
        return "동시에 활성화할 수 있는 방은 최대 2개입니다.";
      case "ROOM_ACCESS_CODE_REQUIRED":
        return "입장 코드를 입력해주세요.";
      default:
        return message;
    }
  }

  return "요청을 처리하지 못했습니다.";
}

export default function LobbyPage() {
  const navigate = useNavigate();
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
  const [createdPrivateAccessCode, setCreatedPrivateAccessCode] = useState<
    string | null
  >(null);
  const [privateAccessCode, setPrivateAccessCode] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

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

  useEffect(() => {
    void Promise.resolve().then(refreshAuthState);
  }, [refreshAuthState]);

  useEffect(() => {
    const handleWindowFocus = () => {
      void refreshAuthState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void refreshAuthState();
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshAuthState]);

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
    (room: { roomId: number; publicRoomNumber: number; type: "public" | "private" }) => {
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
        setModalError(getErrorMessage(error));
      } finally {
        setCreateLoading(false);
      }
    },
    [enterRoomFromResponse, loadRooms],
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
      setModalError(getErrorMessage(error));
    } finally {
      setCreateLoading(false);
    }
  }, [createdPrivateAccessCode, enterRoomFromResponse]);

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
        setModalError(getErrorMessage(error));
      } finally {
        setEnterLoading(false);
      }
    },
    [enterRoomFromResponse, requireLogin],
  );

  const handleEnterPrivateRoom = useCallback(async () => {
      if (!(await requireLogin())) {
        return;
      }

    setEnterLoading(true);
    setModalError(null);

    try {
      const { data } = await roomApi.enterPrivateRoom(privateAccessCode.trim());
      setEnterModalOpen(false);
      enterRoomFromResponse(data.room);
    } catch (error) {
      setModalError(getErrorMessage(error));
    } finally {
      setEnterLoading(false);
    }
  }, [enterRoomFromResponse, privateAccessCode, requireLogin]);

  const handleResolveRoomNumber = useCallback(
    async (publicRoomNumber: number): Promise<"entered" | "private"> => {
      if (!(await requireLogin())) {
        throw new Error("LOGIN_REQUIRED");
      }

      setEnterLoading(true);
      setModalError(null);

      try {
        const { data } = await roomApi.getRoomDetail(publicRoomNumber);

        if (data.room.type === "private") {
          return "private";
        }

        const entered = await roomApi.enterPublicRoom(publicRoomNumber);
        enterRoomFromResponse(entered.data.room);
        setEnterModalOpen(false);
        return "entered";
      } catch (error) {
        setModalError(getErrorMessage(error));
        throw error;
      } finally {
        setEnterLoading(false);
      }
    },
    [enterRoomFromResponse, requireLogin],
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
    <main className="min-h-screen bg-[#f7f2eb] px-6 py-10 text-[#272E37]">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[32px] border border-[#e3d9cf] bg-white p-8 shadow-[0_18px_60px_rgba(39,46,55,0.08)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeTab === "completed"
                  ? "bg-[#272E37] text-white"
                  : "border border-[#d9cdc1] text-[#5f6368]"
              }`}
            >
              완성된 캔버스
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rooms")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeTab === "rooms"
                  ? "bg-[#272E37] text-white"
                  : "border border-[#d9cdc1] text-[#5f6368]"
              }`}
            >
              방 목록
            </button>
          </div>

          <div className="mt-6">
            {activeTab === "completed" ? (
              <div className="min-h-[520px] rounded-[28px] border border-dashed border-[#d9cdc1] bg-[#fbf7f2] p-6">
                <h1 className="text-[28px] font-semibold tracking-tight">
                  완성된 캔버스
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#5f6368]">
                  광장/공개방 필터와 날짜 범위 조회는 다음 단계에서 연결합니다.
                </p>
              </div>
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

        <aside className="grid gap-6">
          <section className="rounded-[32px] border border-[#e3d9cf] bg-white p-8 shadow-[0_18px_60px_rgba(39,46,55,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b6b62]">
              Account
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              {authState === "authenticated"
                ? nickname ?? "로그인됨"
                : "로그인"}
            </h2>
            <button
              type="button"
              onClick={() => {
                if (authState === "authenticated") {
                  void handleLogout();
                  return;
                }

                navigate("/login");
              }}
              className="mt-5 rounded-2xl border border-[#d9cdc1] px-4 py-3 text-sm font-semibold text-[#272E37]"
            >
              {authState === "authenticated" ? "로그아웃" : "로그인"}
            </button>
          </section>

          <section className="rounded-[32px] border border-[#e3d9cf] bg-[#ff8870] p-8 text-white shadow-[0_18px_60px_rgba(209,77,40,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">
              Plaza
            </p>
            <h2 className="mt-2 text-2xl font-semibold">광장 현재 상태</h2>
            <p className="mt-3 text-sm leading-6 text-white/88">
              광장 현재 정보와 최근 라운드 스냅샷은 다음 단계에서 연결합니다.
            </p>
          </section>

          <section className="rounded-[32px] border border-[#e3d9cf] bg-white p-8 shadow-[0_18px_60px_rgba(39,46,55,0.08)]">
            <div className="grid gap-3">
              <button
                type="button"
                onClick={handleParticipatePlaza}
                className="rounded-2xl bg-[#272E37] px-4 py-3 text-center text-sm font-semibold text-white"
              >
                광장 참여
              </button>
              <button
                type="button"
                onClick={handleCreateRoom}
                className="rounded-2xl border border-[#d9cdc1] px-4 py-3 text-sm font-semibold text-[#272E37]"
              >
                방 생성
              </button>
              <button
                type="button"
                onClick={handleEnterRoom}
                className="rounded-2xl border border-[#d9cdc1] px-4 py-3 text-sm font-semibold text-[#272E37]"
              >
                방 입장
              </button>
            </div>
          </section>
        </aside>
      </div>

      {loginRequiredOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-7 shadow-[0_30px_100px_rgba(39,46,55,0.28)]">
            <h2 className="text-xl font-semibold text-[#272E37]">
              로그인이 필요합니다
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#5f6368]">
              광장 참여, 방 생성, 방 입장은 로그인 후 사용할 수 있습니다.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setLoginRequiredOpen(false)}
                className="flex-1 rounded-2xl border border-[#d9cdc1] px-4 py-3 text-sm font-semibold text-[#272E37]"
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex-1 rounded-2xl bg-[#272E37] px-4 py-3 text-sm font-semibold text-white"
              >
                로그인
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
