import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  gridX: number;
  gridY: number;
  selectedX: number | null;
  selectedY: number | null;
  onNavigate: (x: number, y: number) => void;
}

export default function CoordinateNavigator({
  gridX,
  gridY,
  selectedX,
  selectedY,
  onNavigate,
}: Props) {
  const [xInput, setXInput] = useState(() =>
    selectedX !== null ? String(selectedX) : "0",
  );
  const [yInput, setYInput] = useState(() =>
    selectedY !== null ? String(selectedY) : "0",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedX !== null) {
      setXInput(String(selectedX));
    }
  }, [selectedX]);

  useEffect(() => {
    if (selectedY !== null) {
      setYInput(String(selectedY));
    }
  }, [selectedY]);

  const handleSubmit = () => {
    const nextX = Number.parseInt(xInput, 10);
    const nextY = Number.parseInt(yInput, 10);

    if (Number.isNaN(nextX) || Number.isNaN(nextY)) {
      setError("X, Y 좌표를 숫자로 입력해 주세요.");
      return;
    }

    if (nextX < 0 || nextX >= gridX || nextY < 0 || nextY >= gridY) {
      setError(
        `이동 가능한 범위는 X: 0-${gridX - 1}, Y: 0-${gridY - 1} 입니다.`,
      );
      return;
    }

    setError("");
    onNavigate(nextX, nextY);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">좌표 이동</p>

      <div className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-gray-500">X</span>
          <input
            type="number"
            min={0}
            max={gridX - 1}
            value={xInput}
            onChange={(event) => setXInput(event.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 rounded-md border border-gray-200 px-3 text-sm outline-none transition focus:border-blue-500"
          />
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-gray-500">Y</span>
          <input
            type="number"
            min={0}
            max={gridY - 1}
            value={yInput}
            onChange={(event) => setYInput(event.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 rounded-md border border-gray-200 px-3 text-sm outline-none transition focus:border-blue-500"
          />
        </label>

        <Button
          type="button"
          size="sm"
          className="h-9 shrink-0 px-3"
          onClick={handleSubmit}
        >
          이동
        </Button>
      </div>

      <p className="text-xs text-gray-400">
        입력한 좌표를 메인 캔버스 화면 중앙으로 이동합니다.
      </p>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
