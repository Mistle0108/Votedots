import { forwardRef } from "react";
import type { PlayBackgroundMode } from "@/features/gameplay/canvas/model/background-assets";
import type { RoomCurrentManageResponse } from "@/features/room/api/room.api";
import { DropdownSelect } from "@/shared/ui/dropdown-select";

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
  roomTerminateDisabled?: boolean;
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
      roomTerminateDisabled = false,
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
            room: "입장 코드",
            accessCode: "입장 코드",
            endGame: "게임 종료",
            endingGame: "종료 중...",
            endRoom: "방 강제 종료",
            white: "흰색",
            gray: "회색",
            black: "검정색",
          }
        : {
            language: "Language",
            background: "Background",
            room: "Access code",
            accessCode: "Access code",
            endGame: "End game",
            endingGame: "Ending...",
            endRoom: "End room",
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
              <DropdownSelect
                value={locale}
                onChange={onLocaleChange}
                options={[
                  { value: "ko", label: "KO" },
                  { value: "en", label: "EN" },
                ]}
                variant="play"
                className="w-full"
                triggerClassName="h-8 w-full min-w-0 rounded-lg border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-2 py-1.5 text-xs font-medium text-[color:var(--page-theme-text-primary)]"
                menuClassName="rounded-xl"
                optionClassName="rounded-lg px-2.5 py-2 text-xs font-medium"
              />
            </div>
          </section>

          <section className="flex items-center gap-3 rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-3 py-2">
            <p className="w-20 shrink-0 text-xs font-semibold text-[color:var(--page-theme-text-secondary)]">
              {labels.background}
            </p>
            <div className="flex w-24 shrink-0 justify-end">
              <DropdownSelect
                value={backgroundMode}
                onChange={onBackgroundModeChange}
                options={[
                  { value: "w", label: labels.white },
                  { value: "g", label: labels.gray },
                  { value: "b", label: labels.black },
                ]}
                variant="play"
                className="w-full"
                triggerClassName="h-8 w-full min-w-0 rounded-lg border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-2 py-1.5 text-xs font-medium text-[color:var(--page-theme-text-primary)]"
                menuClassName="rounded-xl"
                optionClassName="rounded-lg px-2.5 py-2 text-xs font-medium"
              />
            </div>
          </section>

          {roomManage ? (
            <section className="rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-3 py-3">
              <p className="text-xs font-semibold text-[color:var(--page-theme-text-secondary)]">
                {labels.room}
              </p>
              <div className="mt-2 rounded-lg border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-[color:var(--page-theme-text-primary)]">
                {roomManage.accessCode ?? "-"}
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
                disabled={
                  roomTerminateLoading || roomTerminateDisabled || !onTerminateRoom
                }
                onClick={onTerminateRoom}
                className="mt-3 w-full rounded-lg bg-[#d14d28] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {roomTerminateLoading ? labels.endingGame : labels.endRoom}
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
