import { useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useI18n } from "@/shared/i18n";
import eyedropperIcon from "@/assets/eyedropper-icon.png";

const CHECKER_PATTERN =
  "linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%, #d1d5db), linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%, #d1d5db)";

interface Props {
  selected: string;
  onChange: (color: string) => void;
  slotColors: string[];
  slotCursor: number;
  onSlotAdd: () => void;
  onSlotReset: () => void;
  onSlotSelect: (color: string, index: number) => void;
}

export default function ColorPalette({
  selected,
  onChange,
  slotColors,
  slotCursor,
  onSlotAdd,
  onSlotReset,
  onSlotSelect,
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
    if (!("EyeDropper" in window)) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eyeDropper = new (window as any).EyeDropper();

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

  return (
    <div className="flex flex-col gap-3">
      <div
        className="overflow-hidden rounded-md border border-[color:var(--page-theme-border-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        <HexColorPicker
          color={selected}
          onChange={onChange}
          style={{ width: "100%", height: 180 }}
        />
      </div>

      <div className="flex items-center gap-1.5">
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
            className="h-7 w-7 shrink-0 cursor-pointer"
            style={{ backgroundColor: selected }}
            onClick={(e) => {
              e.stopPropagation();
              colorInputRef.current?.click();
            }}
          />
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

      <div className="grid grid-cols-6 gap-1">
        {slotColors.map((c, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              onSlotSelect(c, idx);
            }}
            className="relative h-7 w-7 rounded border-2"
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
  );
}
