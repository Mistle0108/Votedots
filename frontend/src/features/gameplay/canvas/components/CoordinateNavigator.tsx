import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";

interface Props {
  gridX: number;
  gridY: number;
  selectedX: number | null;
  selectedY: number | null;
  onNavigate: (x: number, y: number, behavior?: ScrollBehavior) => void;
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

  const handleNumericChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value.replace(/[^0-9]/g, "");
      setter(nextValue);
      if (error) {
        setError("");
      }
    };

  const handleSubmit = () => {
    if (xInput === "" || yInput === "") {
      setError("X, Y 좌표를 입력해 주세요.");
      return;
    }

    const nextX = Number.parseInt(xInput, 10);
    const nextY = Number.parseInt(yInput, 10);

    if (Number.isNaN(nextX) || Number.isNaN(nextY)) {
      setError("X, Y 좌표는 숫자만 입력할 수 있습니다.");
      return;
    }

    if (nextX < 0 || nextX >= gridX || nextY < 0 || nextY >= gridY) {
      setError(
        `이동 가능한 범위는 X: 0-${gridX - 1}, Y: 0-${gridY - 1} 입니다.`,
      );
      return;
    }

    setError("");
    onNavigate(nextX, nextY, "smooth");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[5fr_2fr] gap-2">
        <div className="grid grid-rows-2 gap-2">
          <div className="flex items-center gap-2 rounded-md border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-3">
            <span className="shrink-0 text-xs font-medium text-[color:var(--page-theme-text-secondary)]">
              X :
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={xInput}
              onChange={handleNumericChange(setXInput)}
              onKeyDown={handleKeyDown}
              className="h-9 w-full border-0 bg-transparent text-sm text-[color:var(--page-theme-text-primary)] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-md border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-3">
            <span className="shrink-0 text-xs font-medium text-[color:var(--page-theme-text-secondary)]">
              Y :
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={yInput}
              onChange={handleNumericChange(setYInput)}
              onKeyDown={handleKeyDown}
              className="h-9 w-full border-0 bg-transparent text-sm text-[color:var(--page-theme-text-primary)] outline-none"
            />
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          className="h-full w-full"
          onClick={handleSubmit}
        >
          이동
        </Button>
      </div>

      {error && (
        <p className="text-xs text-[color:var(--page-theme-alert)]">{error}</p>
      )}
    </div>
  );
}
