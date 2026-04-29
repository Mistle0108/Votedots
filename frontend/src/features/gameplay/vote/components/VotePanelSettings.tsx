import { forwardRef } from "react";
import type { PlayBackgroundMode } from "@/features/gameplay/canvas/model/background-assets";

interface Props {
  locale: "ko" | "en";
  onLocaleChange: (locale: "ko" | "en") => void;
  backgroundMode: PlayBackgroundMode;
  onBackgroundModeChange: (mode: PlayBackgroundMode) => void;
}

const VotePanelSettings = forwardRef<HTMLDivElement, Props>(
  ({ locale, onLocaleChange, backgroundMode, onBackgroundModeChange }, ref) => {
    const labels =
      locale === "ko"
        ? {
            language: "언어",
            background: "배경",
            white: "흰색",
            gray: "회색",
            black: "검정색",
          }
        : {
            language: "Language",
            background: "Background",
            white: "white",
            gray: "gray",
            black: "black",
          };

    return (
      <div
        ref={ref}
        className="absolute right-0 top-11 z-10 w-56 rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] p-3 shadow-lg"
      >
        <div className="flex flex-col gap-2">
          <section className="flex items-center gap-3 rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-3 py-2">
            <p className="w-20 shrink-0 text-xs font-semibold text-[color:var(--page-theme-text-secondary)]">
              {labels.language}
            </p>
            <div className="flex w-20 shrink-0 justify-end">
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
            <div className="flex w-20 shrink-0 justify-end">
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
        </div>
      </div>
    );
  },
);

VotePanelSettings.displayName = "VotePanelSettings";

export default VotePanelSettings;
