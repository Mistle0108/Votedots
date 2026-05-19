import { forwardRef } from "react";
import type { PlayBackgroundMode } from "@/features/gameplay/canvas/model/background-assets";
import type { RoomCurrentManageResponse } from "@/features/room/api/room.api";

interface Props {
  locale: "ko" | "en";
  onLocaleChange: (locale: "ko" | "en") => void;
  backgroundMode: PlayBackgroundMode;
  onBackgroundModeChange: (mode: PlayBackgroundMode) => void;
  roomManage?: RoomCurrentManageResponse["room"] | null;
  roomEndGameLoading?: boolean;
  roomEndGameDisabled?: boolean;
  onEndGame?: () => void;
  roomTerminateLoading?: boolean;
  onTerminateRoom?: () => void;
  tutorialId?: string;
}

const VotePanelSettings = forwardRef<HTMLDivElement, Props>(
  (
    {
      locale,
      onLocaleChange,
      backgroundMode,
      onBackgroundModeChange,
      roomManage,
      roomEndGameLoading = false,
      roomEndGameDisabled = false,
      onEndGame,
      roomTerminateLoading = false,
      onTerminateRoom,
      tutorialId,
    },
    ref,
  ) => {
    const labels =
      locale === "ko"
        ? {
            language: "언어",
            background: "배경",
            room: "방 상세",
            roomTitle: "방 제목",
            profile: "프로필",
            intro: "인트로",
            rounds: "총 라운드",
            votes: "라운드당 표수",
            endWait: "게임 종료 대기",
            accessCode: "입장 코드",
            endGame: "게임 종료",
            endingGame: "종료 중...",
            white: "흰색",
            gray: "회색",
            black: "검정색",
          }
        : {
            language: "Language",
            background: "Background",
            room: "Room",
            roomTitle: "Title",
            profile: "Profile",
            intro: "Intro",
            rounds: "Rounds",
            votes: "Votes / round",
            endWait: "Game end wait",
            accessCode: "Access code",
            endGame: "End game",
            endingGame: "Ending...",
            white: "white",
            gray: "gray",
            black: "black",
          };

    return (
      <div
        ref={ref}
        data-tutorial-id={tutorialId}
        className="absolute right-0 top-11 z-10 w-64 rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] p-3 shadow-lg"
      >
        <div className="flex flex-col gap-2">
          <section className="flex items-center gap-3 rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-3 py-2">
            <p className="w-20 shrink-0 text-xs font-semibold text-[color:var(--page-theme-text-secondary)]">
              {labels.language}
            </p>
            <div className="flex w-24 shrink-0 justify-end">
              <select
                value={locale}
                onChange={(event) =>
                  onLocaleChange(event.target.value as "ko" | "en")
                }
                className="h-8 w-full min-w-0 rounded-lg border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-2 py-1.5 text-xs font-medium text-[color:var(--page-theme-text-primary)] outline-none"
              >
                <option value="ko">KO</option>
                <option value="en">EN</option>
              </select>
            </div>
          </section>

          <section className="flex items-center gap-3 rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-3 py-2">
            <p className="w-20 shrink-0 text-xs font-semibold text-[color:var(--page-theme-text-secondary)]">
              {labels.background}
            </p>
            <div className="flex w-24 shrink-0 justify-end">
              <select
                value={backgroundMode}
                onChange={(event) =>
                  onBackgroundModeChange(event.target.value as PlayBackgroundMode)
                }
                className="h-8 w-full min-w-0 rounded-lg border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-2 py-1.5 text-xs font-medium text-[color:var(--page-theme-text-primary)] outline-none"
              >
                <option value="w">{labels.white}</option>
                <option value="g">{labels.gray}</option>
                <option value="b">{labels.black}</option>
              </select>
            </div>
          </section>

          {roomManage ? (
            <section className="rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-3 py-3">
              <p className="text-xs font-semibold text-[color:var(--page-theme-text-secondary)]">
                {labels.room}
              </p>
              <div className="mt-2 grid gap-1 text-xs text-[color:var(--page-theme-text-primary)]">
                <p>
                  {labels.roomTitle}: {roomManage.title}
                </p>
                <p>
                  {labels.profile}: {roomManage.settings.profileKey}
                </p>
                <p>
                  {labels.intro}: {roomManage.settings.introPhaseSec}s
                </p>
                <p>
                  {labels.rounds}: {roomManage.settings.totalRounds}
                </p>
                <p>
                  {labels.votes}: {roomManage.settings.votesPerRound}
                </p>
                <p>
                  {labels.endWait}: {roomManage.settings.gameEndWaitSec}s
                </p>
                {roomManage.accessCode ? (
                  <p>
                    {labels.accessCode}: {roomManage.accessCode}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={
                  roomEndGameLoading || roomEndGameDisabled || !onEndGame
                }
                onClick={onEndGame}
                className="mt-3 w-full rounded-lg bg-[#272E37] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {roomEndGameLoading ? labels.endingGame : labels.endGame}
              </button>
              <button
                type="button"
                disabled={roomTerminateLoading || !onTerminateRoom}
                onClick={onTerminateRoom}
                className="mt-3 w-full rounded-lg bg-[#d14d28] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {roomTerminateLoading
                  ? locale === "ko"
                    ? "종료 중..."
                    : "Ending..."
                  : locale === "ko"
                    ? "방 강제 종료"
                    : "End room"}
              </button>
            </section>
          ) : null}
        </div>
      </div>
    );
  },
);

VotePanelSettings.displayName = "VotePanelSettings";

export default VotePanelSettings;
