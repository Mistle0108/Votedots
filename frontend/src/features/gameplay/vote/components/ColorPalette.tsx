import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import ColorSlotGrid from "./ColorSlotGrid";

interface ColorPaletteProps {
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
}: ColorPaletteProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [draftHex, setDraftHex] = useState(selected);

  useEffect(() => {
    setDraftHex(selected);
  }, [selected]);

  const handleEyeDropper = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!("EyeDropper" in window)) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eyeDropper = new (window as any).EyeDropper();

    try {
      const result = await eyeDropper.open();
      onChange(result.sRGBHex);
    } catch {
      // 브라우저 기본 취소(Esc 등) 시 색상 변경 없음
    }
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const value = e.target.value;
    setDraftHex(value);

    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      onChange(value);
    }
  };

  const handleHexBlur = () => {
    setDraftHex(selected);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="overflow-hidden rounded-md border border-gray-200"
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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-xs text-gray-500 hover:bg-gray-50"
          title="색상 선택 (취소는 Esc)"
        >
          🖊
        </button>

        <div className="flex flex-1 items-center overflow-hidden rounded border border-gray-200">
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
            value={draftHex}
            onChange={handleHexInput}
            onBlur={handleHexBlur}
            onClick={(e) => e.stopPropagation()}
            className="w-0 flex-1 px-1.5 text-xs outline-none"
            maxLength={7}
          />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSlotAdd();
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
          title="슬롯에 추가"
        >
          +
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSlotReset();
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 text-xs text-gray-500 hover:bg-gray-50"
          title="초기화"
        >
          ↺
        </button>
      </div>

      <ColorSlotGrid
        slotColors={slotColors}
        slotCursor={slotCursor}
        onSlotSelect={onSlotSelect}
      />
    </div>
  );
}
