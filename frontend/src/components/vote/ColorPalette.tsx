import { useRef } from "react";

interface Props {
  selected: string;
  onChange: (color: string) => void;
  slotColors: string[];
  slotCursor: number;
  onSlotAdd: () => void;
  onSlotReset: () => void;
  onSlotSelect: (color: string) => void;
}

const DEFAULT_COLORS = [
  "#000000", "#ffffff", "#ff0000", "#00ff00",
  "#0000ff", "#ffff00", "#ff8800", "#ff00ff",
  "#00ffff", "#8800ff", "#888888", "#cccccc",
];

export default function ColorPalette({
  selected,
  onChange,
  slotColors,
  slotCursor,
  onSlotAdd,
  onSlotReset,
  onSlotSelect,
}: Props) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const eyeDropperRef = useRef<{ open: () => Promise<{ sRGBHex: string }> } | null>(null);

  const handleEyeDropper = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!("EyeDropper" in window)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eyeDropperRef.current = new (window as any).EyeDropper();
    try {
      const result = await eyeDropperRef.current!.open();
      onChange(result.sRGBHex);
    } catch {
      // 취소
    }
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = e.target.value;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 기본 색상 그리드 */}
      <div className="grid grid-cols-6 gap-1">
        {DEFAULT_COLORS.map((color, idx) => (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); onChange(color); }}
            className="w-7 h-7 rounded border-2"
            style={{
              backgroundColor: color,
              borderColor: selected === color ? "#3b82f6" : "#d1d5db",
            }}
          />
        ))}
      </div>

      {/* 컨트롤 한 줄: 스포이드 | 색상 미리보기 + HEX | + | 초기화 */}
      <div className="flex items-center gap-1.5">
        {/* 스포이드 */}
        <button
          onClick={handleEyeDropper}
          className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs shrink-0"
          title="스포이드"
        >
          🖊
        </button>

        {/* 색상 미리보기 + HEX 입력 */}
        <div className="flex items-center flex-1 border border-gray-200 rounded overflow-hidden">
          <div
            className="w-7 h-7 shrink-0 cursor-pointer"
            style={{ backgroundColor: selected }}
            onClick={(e) => { e.stopPropagation(); colorInputRef.current?.click(); }}
          />
          <input
            ref={colorInputRef}
            type="color"
            value={selected}
            onChange={(e) => { e.stopPropagation(); onChange(e.target.value); }}
            className="absolute opacity-0 w-0 h-0"
          />
          <input
            type="text"
            defaultValue={selected}
            key={selected}
            onChange={handleHexInput}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-xs px-1.5 outline-none w-0"
            maxLength={7}
          />
        </div>

        {/* + 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); onSlotAdd(); }}
          className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 text-gray-500 text-sm shrink-0"
          title="슬롯에 추가"
        >
          +
        </button>

        {/* 초기화 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); onSlotReset(); }}
          className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs shrink-0"
          title="초기화"
        >
          ↺
        </button>
      </div>

      {/* 슬롯 6개 × 2줄 */}
      <div className="grid grid-cols-6 gap-1">
        {slotColors.map((c, idx) => (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); onSlotSelect(c); }}
            className="w-7 h-7 rounded border-2 relative"
            style={{
              backgroundColor: c,
              borderColor: selected === c ? "#3b82f6" : idx === slotCursor ? "#f97316" : "#d1d5db",
            }}
          >
            {idx === slotCursor && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white drop-shadow">
                ▼
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}