import { HexColorPicker } from "react-colorful";

interface MobileFloatingPaletteProps {
  open: boolean;
  color: string;
  onChange: (color: string) => void;
  onCommitColor: (color?: string) => void;
  tutorialId?: string;
}

export default function MobileFloatingPalette({
  open,
  color,
  onChange,
  onCommitColor,
  tutorialId,
}: MobileFloatingPaletteProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="absolute right-[calc(100%+12px)] top-0 z-20"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onPointerUp={() => onCommitColor(color)}
      onMouseUp={() => onCommitColor(color)}
      onTouchEnd={() => onCommitColor(color)}
      data-tutorial-id={tutorialId}
    >
      <div className="w-[228px] rounded-[24px] border border-[color:var(--page-theme-border-primary)] bg-[color:rgba(255,255,255,0.98)] p-3 shadow-[0_16px_40px_rgba(15,23,42,0.2)] backdrop-blur">
        <div className="overflow-hidden rounded-[20px] border border-[color:var(--page-theme-border-primary)]">
          <HexColorPicker
            color={color}
            onChange={onChange}
            style={{ width: "100%", height: 188 }}
          />
        </div>
      </div>
    </div>
  );
}
