const CHECKER_PATTERN =
  "linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%, #d1d5db), linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%, #d1d5db)";

interface ColorSlotGridProps {
  slotColors: string[];
  slotCursor: number;
  onSlotSelect: (color: string, index: number) => void;
}

export default function ColorSlotGrid({
  slotColors,
  slotCursor,
  onSlotSelect,
}: ColorSlotGridProps) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {slotColors.map((color, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            onSlotSelect(color, index);
          }}
          className="relative h-7 w-7 rounded border-2"
          style={{
            backgroundColor: color || "#f9fafb",
            backgroundImage: color ? "none" : CHECKER_PATTERN,
            backgroundPosition: color ? undefined : "0 0, 4px 4px",
            backgroundSize: color ? undefined : "8px 8px",
            borderColor: index === slotCursor ? "#f97316" : "#d1d5db",
          }}
        >
          {index === slotCursor && (
            <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white drop-shadow">
              ▼
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
