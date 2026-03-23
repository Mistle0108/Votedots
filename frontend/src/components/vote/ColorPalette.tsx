interface Props {
  selected: string;
  onChange: (color: string) => void;
}

const COLORS = [
  "#000000",
  "#ffffff",
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#ff00ff",
  "#00ffff",
  "#ff8800",
  "#8800ff",
  "#00ff88",
  "#ff0088",
  "#888888",
  "#444444",
  "#cccccc",
  "#ff4444",
];

export default function ColorPalette({ selected, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
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
