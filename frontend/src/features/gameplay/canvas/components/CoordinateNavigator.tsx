import { useState } from "react";
import { useI18n } from "@/shared/i18n";
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
  const { t } = useI18n();
  const [xInputState, setXInputState] = useState(() => ({
    value: selectedX !== null ? String(selectedX) : "0",
    source: selectedX,
  }));
  const [yInputState, setYInputState] = useState(() => ({
    value: selectedY !== null ? String(selectedY) : "0",
    source: selectedY,
  }));
  const [error, setError] = useState("");
  const resolvedXInput =
    xInputState.source === selectedX
      ? xInputState.value
      : selectedX !== null
        ? String(selectedX)
        : "0";
  const resolvedYInput =
    yInputState.source === selectedY
      ? yInputState.value
      : selectedY !== null
        ? String(selectedY)
        : "0";

  const handleNumericChange =
    (
      setter: React.Dispatch<
        React.SetStateAction<{ value: string; source: number | null }>
      >,
      source: number | null,
    ) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value.replace(/[^0-9]/g, "");
      setter({
        value: nextValue,
        source,
      });
      if (error) {
        setError("");
      }
    };

  const handleSubmit = () => {
    if (resolvedXInput === "" || resolvedYInput === "") {
      setError(t("coordinate.required"));
      return;
    }

    const nextX = Number.parseInt(resolvedXInput, 10);
    const nextY = Number.parseInt(resolvedYInput, 10);

    if (Number.isNaN(nextX) || Number.isNaN(nextY)) {
      setError(t("coordinate.numbersOnly"));
      return;
    }

    if (nextX < 0 || nextX >= gridX || nextY < 0 || nextY >= gridY) {
      setError(t("coordinate.range", { maxX: gridX - 1, maxY: gridY - 1 }));
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
              value={resolvedXInput}
              onChange={handleNumericChange(setXInputState, selectedX)}
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
              value={resolvedYInput}
              onChange={handleNumericChange(setYInputState, selectedY)}
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
          {t("coordinate.move")}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-[color:var(--page-theme-alert)]">{error}</p>
      )}
    </div>
  );
}
