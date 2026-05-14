import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/features/auth";

type AuthState = "authenticated" | "guest" | "unknown";

export default function LobbyPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>("unknown");
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void authApi
      .me()
      .then(() => {
        if (!cancelled) {
          setAuthState("authenticated");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthState("guest");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const requireLogin = (): boolean => {
    if (authState === "authenticated") {
      return true;
    }

    setLoginRequiredOpen(true);
    return false;
  };

  const handleParticipatePlaza = () => {
    if (!requireLogin()) {
      return;
    }

    navigate("/plaza");
  };

  const handleCreateRoom = () => {
    if (!requireLogin()) {
      return;
    }
  };

  const handleEnterRoom = () => {
    if (!requireLogin()) {
      return;
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f2eb] px-6 py-10 text-[#272E37]">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[32px] border border-[#e3d9cf] bg-white p-8 shadow-[0_18px_60px_rgba(39,46,55,0.08)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full bg-[#272E37] px-4 py-2 text-sm font-semibold text-white"
            >
              완성된 캔버스
            </button>
            <button
              type="button"
              className="rounded-full border border-[#d9cdc1] px-4 py-2 text-sm font-semibold text-[#5f6368]"
            >
              방 목록
            </button>
          </div>

          <div className="mt-6 min-h-[520px] rounded-[28px] border border-dashed border-[#d9cdc1] bg-[#fbf7f2] p-6">
            <div className="max-w-xl">
              <h1 className="text-[28px] font-semibold tracking-tight">
                로비
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#5f6368]">
                완성된 캔버스 목록과 공개방 목록이 이 영역에 들어옵니다.
                공개방은 상세 정보를 보여주고, 프라이빗방은 입장 코드 입력
                흐름으로 연결됩니다.
              </p>
            </div>
          </div>
        </section>

        <aside className="grid gap-6">
          <section className="rounded-[32px] border border-[#e3d9cf] bg-white p-8 shadow-[0_18px_60px_rgba(39,46,55,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b6b62]">
                  Account
                </p>
                <h2 className="mt-2 text-xl font-semibold">로그인 영역</h2>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-[#e3d9cf] bg-[#ff8870] p-8 text-white shadow-[0_18px_60px_rgba(209,77,40,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">
              Plaza
            </p>
            <h2 className="mt-2 text-2xl font-semibold">광장 현재 상태</h2>
            <p className="mt-3 text-sm leading-6 text-white/88">
              현재 광장에서 진행 중인 게임의 최근 라운드 스냅샷과 진행 정보가
              이 영역에 표시됩니다.
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
    </main>
  );
}
