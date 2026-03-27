interface Props {
  selected: string;
  onChange: (color: string) => void;
  extraColors?: string[];
}

const DEFAULT_COLORS = [
  "#000000",
  "#ffffff",
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#ff8800",
  "#ff00ff",
  "#00ffff",
  "#8800ff",
  "#888888",
  "#cccccc",
];

export default function ColorPalette({
  selected,
  onChange,
  extraColors = [],
}: Props) {
  // 기본 12개에서 extraColors로 마지막부터 교체
  const colors = [...DEFAULT_COLORS];
  extraColors.forEach((color, i) => {
    colors[DEFAULT_COLORS.length - 1 - i] = color;
  });

  return (
    <div className="grid grid-cols-6 gap-1">
      {colors.map((color, idx) => (
        <button
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            onChange(color);
          }}
          className="w-7 h-7 rounded border-2"
          style={{
            backgroundColor: color,
            borderColor: selected === color ? "#3b82f6" : "#d1d5db",
          }}
        />
      ))}
    </div>
  );
}
