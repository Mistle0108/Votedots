import { forwardRef } from "react";

interface Props {
  locale: "ko" | "en";
  onLocaleChange: (locale: "ko" | "en") => void;
}

const VotePanelSettings = forwardRef<HTMLDivElement, Props>(
  ({ locale, onLocaleChange }, ref) => {
    return (
      <div
        ref={ref}
        className="absolute right-0 top-11 z-10 w-56 rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] p-3 shadow-lg"
      >
      <div className="flex flex-col gap-2">
        <section className="flex items-center gap-3 rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-3 py-2">
          <p className="w-20 shrink-0 text-xs font-semibold text-[color:var(--page-theme-text-secondary)]">
            Language
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
            Background
          </p>
          <div className="flex w-20 shrink-0 justify-end">
            <select
              defaultValue="w"
              className="h-8 w-full min-w-0 rounded-lg border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-2 py-1.5 text-xs font-medium text-[color:var(--page-theme-text-primary)] outline-none"
            >
              <option value="w">W</option>
              <option value="g">G</option>
              <option value="b">B</option>
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
