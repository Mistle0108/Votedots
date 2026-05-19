import { useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useI18n } from "@/shared/i18n";
import eyedropperIcon from "@/assets/eyedropper-icon.png";

const CHECKER_PATTERN =
  "linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%, #d1d5db), linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%, #d1d5db)";

type EyeDropperResult = {
  sRGBHex: string;
};

type EyeDropperInstance = {
  open: () => Promise<EyeDropperResult>;
};

type EyeDropperConstructor = new () => EyeDropperInstance;

type VoteEntry = {
  color: string;
  count: number;
};

interface Props {
  selected: string;
  onChange: (color: string) => void;
  slotColors: string[];
  slotCursor: number;
  onSlotAdd: () => void;
  onSlotReset: () => void;
  onSlotSelect: (color: string, index: number) => void;
  layout?: "default" | "mobile-compact";
  voteEntries?: VoteEntry[];
}

export default function ColorPalette({
  selected,
  onChange,
  slotColors,
  slotCursor,
  onSlotAdd,
  onSlotReset,
  onSlotSelect,
  layout = "default",
  voteEntries = [],
}: Props) {
  const { t } = useI18n();
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [draftState, setDraftState] = useState(() => ({
    value: selected,
    source: selected,
  }));
  const resolvedDraftHex =
    draftState.source === selected ? draftState.value : selected;

  const handleEyeDropper = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const eyeDropperCtor = (
      window as Window & {
        EyeDropper?: EyeDropperConstructor;
      }
    ).EyeDropper;
    if (!eyeDropperCtor) return;

    const eyeDropper = new eyeDropperCtor();

    try {
      const result = await eyeDropper.open();
      onChange(result.sRGBHex);
    } catch {
      // noop
    }
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const value = e.target.value;
    setDraftState({
      value,
      source: selected,
    });

    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      onChange(value);
    }
  };

  const handleHexBlur = () => {
    setDraftState({
      value: selected,
      source: selected,
    });
  };

  const isMobileCompact = layout === "mobile-compact";
  const favorites = slotColors;
  const mobileVoteEntries = voteEntries.slice(0, 3);
  const paddedMobileVoteEntries = Array.from(
    { length: 3 },
    (_, index) => mobileVoteEntries[index] ?? null,
  );
  const mobileVoteMaxCount = mobileVoteEntries[0]?.count ?? 1;

  return (
    <div
      className={
        isMobileCompact ? "flex items-start gap-3" : "flex flex-col gap-3"
      }
    >
      <div
        className={
          isMobileCompact ? "flex min-w-0 flex-[3] flex-col" : undefined
        }
      >
        {isMobileCompact ? (
          <>
            <div
              className="overflow-hidden rounded-md border border-[color:var(--page-theme-border-primary)]"
              onClick={(e) => e.stopPropagation()}
            >
              <HexColorPicker
                color={selected}
                onChange={onChange}
                style={{ width: "100%", height: 136 }}
              />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              <button
                onClick={handleEyeDropper}
                className="flex h-9 w-full items-center justify-center rounded border border-[color:var(--page-theme-border-primary)] text-xs text-[color:var(--page-theme-text-secondary)] hover:bg-[color:var(--page-theme-surface-secondary)]"
                title={t("vote.palette.eyeDropper")}
              >
                <img
                  src={eyedropperIcon}
                  alt=""
                  className="h-4 w-4 object-contain"
                  draggable={false}
                />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  colorInputRef.current?.click();
                }}
                className="flex h-9 w-full items-center justify-center rounded border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)]"
                title={resolvedDraftHex}
              >
                <div
                  className="h-6 w-6 rounded border border-[color:var(--page-theme-border-secondary)]"
                  style={{ backgroundColor: selected }}
                />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSlotAdd();
                }}
                className="flex h-9 w-full items-center justify-center rounded border border-[color:var(--page-theme-border-primary)] text-sm text-[color:var(--page-theme-text-secondary)] hover:bg-[color:var(--page-theme-surface-secondary)]"
                title={t("vote.palette.addSlot")}
              >
                +
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSlotReset();
                }}
                className="flex h-9 w-full items-center justify-center rounded border border-[color:var(--page-theme-border-primary)] text-xs text-[color:var(--page-theme-text-secondary)] hover:bg-[color:var(--page-theme-surface-secondary)]"
                title={t("vote.palette.reset")}
              >
                ↺
              </button>
            </div>

            <input
              ref={colorInputRef}
              type="color"
              value={selected}
              onChange={(e) => {
                e.stopPropagation();
                onChange(e.target.value);
              }}
              className="absolute h-0 w-0 opacity-0"
            />
          </>
        ) : (
          <>
            <div
              className="overflow-hidden rounded-md border border-[color:var(--page-theme-border-primary)]"
              onClick={(e) => e.stopPropagation()}
            >
              <HexColorPicker
                color={selected}
                onChange={onChange}
                style={{ width: "100%", height: 148 }}
              />
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              <button
                onClick={handleEyeDropper}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[color:var(--page-theme-border-primary)] text-xs text-[color:var(--page-theme-text-secondary)] hover:bg-[color:var(--page-theme-surface-secondary)]"
                title={t("vote.palette.eyeDropper")}
              >
                <img
                  src={eyedropperIcon}
                  alt=""
                  className="h-4 w-4 object-contain"
                  draggable={false}
                />
              </button>

              <div className="flex flex-1 items-center overflow-hidden rounded border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)]">
                <div
                  className="h-7 w-7 shrink-0"
                  style={{ backgroundColor: selected }}
                />
                <input
                  type="text"
                  value={resolvedDraftHex}
                  onChange={handleHexInput}
                  onBlur={handleHexBlur}
                  onClick={(e) => e.stopPropagation()}
                  className="w-0 flex-1 bg-transparent px-1.5 text-xs text-[color:var(--page-theme-text-primary)] outline-none"
                  maxLength={7}
                />
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSlotAdd();
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[color:var(--page-theme-border-primary)] text-sm text-[color:var(--page-theme-text-secondary)] hover:bg-[color:var(--page-theme-surface-secondary)]"
                title={t("vote.palette.addSlot")}
              >
                +
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSlotReset();
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[color:var(--page-theme-border-primary)] text-xs text-[color:var(--page-theme-text-secondary)] hover:bg-[color:var(--page-theme-surface-secondary)]"
                title={t("vote.palette.reset")}
              >
                ↺
              </button>
            </div>
          </>
        )}
      </div>

      <div
        className={
          isMobileCompact
            ? "flex min-w-[136px] max-w-[136px] flex-[2] flex-col gap-1.5"
            : undefined
        }
      >
        {isMobileCompact ? (
          <div className="h-[116px] rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-2.5 py-1.5">
            <p className="mb-1 text-[10px] font-semibold text-[color:var(--page-theme-text-secondary)]">
              {t("vote.popup.liveStatus")}
            </p>
            <div className="space-y-0.5">
              {paddedMobileVoteEntries.map((entry, index) =>
                entry ? (
                  <button
                    key={entry.color}
                    className="flex w-full items-center gap-1.5 rounded px-0.5 py-0.5 text-left hover:bg-[color:var(--page-theme-surface-secondary)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(entry.color);
                    }}
                  >
                    <div
                      className="h-3 w-3 shrink-0 rounded-sm border border-[color:var(--page-theme-border-secondary)]"
                      style={{ backgroundColor: entry.color }}
                    />
                    <div className="h-2 flex-1 rounded bg-[color:var(--page-theme-surface-secondary)]">
                      <div
                        className="h-2 rounded transition-all"
                        style={{
                          width: `${(entry.count / mobileVoteMaxCount) * 100}%`,
                          backgroundColor: entry.color,
                        }}
                      />
                    </div>
                    <span className="w-4 shrink-0 text-right text-[10px] text-[color:var(--page-theme-text-secondary)]">
                      {entry.count}
                    </span>
                  </button>
                ) : (
                  <div
                    key={`empty-vote-entry-${index}`}
                    className="flex w-full items-center gap-1.5 px-0.5 py-0.5"
                  >
                    <div
                      className="h-3 w-3 shrink-0 rounded-sm border border-[color:var(--page-theme-border-secondary)]"
                      style={{
                        backgroundColor: "#f9fafb",
                        backgroundImage: CHECKER_PATTERN,
                        backgroundPosition: "0 0, 4px 4px",
                        backgroundSize: "8px 8px",
                      }}
                    />
                    <div className="h-2 flex-1 rounded bg-[color:var(--page-theme-surface-secondary)] opacity-60" />
                    <span className="w-4 shrink-0 text-right text-[10px] text-[color:var(--page-theme-text-tertiary)]">
                      -
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        ) : null}

        <div
          className={
            isMobileCompact
              ? "grid grid-cols-4 gap-2"
              : "grid grid-cols-6 gap-1"
          }
        >
          {favorites.map((c, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                onSlotSelect(c, idx);
              }}
              className={`relative rounded border-2 ${
                isMobileCompact ? "aspect-square w-full" : "h-7 w-7"
              }`}
              style={{
                backgroundColor: c || "var(--page-theme-surface-secondary)",
                backgroundImage: c ? "none" : CHECKER_PATTERN,
                backgroundPosition: c ? undefined : "0 0, 4px 4px",
                backgroundSize: c ? undefined : "8px 8px",
                borderColor:
                  idx === slotCursor
                    ? "var(--page-theme-primary-action)"
                    : "var(--page-theme-border-primary)",
              }}
            >
              {idx === slotCursor && (
                <span className="absolute inset-0 flex items-center justify-center text-[16px] text-[color:var(--page-theme-primary-action-text)] drop-shadow">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
