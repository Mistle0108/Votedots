import { useState, useEffect, useRef } from "react";
import { Button } from "@/shared/ui/button";
import ColorPalette from "./ColorPalette";
import { voteApi } from "@/features/gameplay/vote/api/vote.api";
import { Cell } from "@/features/gameplay/canvas";

const SLOT_COUNT = 12;
const STORAGE_KEYS = {
  slotColors: "votedots:vote-popup-slot-colors",
  lastVotedColor: "votedots:last-voted-color",
} as const;
const INITIAL_SLOTS = Array(SLOT_COUNT).fill("");
const CHECKER_PATTERN =
  "linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%, #d1d5db), linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%, #d1d5db)";

interface VoteEntry {
  cellId: number;
  x: number;
  y: number;
  color: string;
  count: number;
}

interface Props {
  canvasId: number;
  roundId: number | null;
  isRoundExpired: boolean;
  selectedCell: Cell;
  votes: Record<string, number>;
  cells: Cell[];
  position: { x: number; y: number };
  onVoteSuccess: () => void;
  onColorChange: (color: string | null) => void;
  onClose: () => void;
}

function loadSlotColors(): string[] {
  if (typeof window === "undefined") return INITIAL_SLOTS;

  const saved = window.localStorage.getItem(STORAGE_KEYS.slotColors);
  if (!saved) return INITIAL_SLOTS;

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return INITIAL_SLOTS;

    const normalized = parsed
      .slice(0, SLOT_COUNT)
      .map((value) => (typeof value === "string" ? value : ""));

    while (normalized.length < SLOT_COUNT) {
      normalized.push("");
    }

    return normalized;
  } catch {
    return INITIAL_SLOTS;
  }
}

function loadLastVotedColor(): string {
  if (typeof window === "undefined") return "#000000";

  const saved = window.localStorage.getItem(STORAGE_KEYS.lastVotedColor);
  if (!saved) return "#000000";

  return /^#[0-9a-fA-F]{6}$/.test(saved) ? saved : "#000000";
}

export default function VotePopup({
  canvasId,
  roundId,
  isRoundExpired,
  selectedCell,
  votes,
  cells,
  position,
  onVoteSuccess,
  onColorChange,
  onClose,
}: Props) {
  const [color, setColor] = useState(() => loadLastVotedColor());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotColors, setSlotColors] = useState<string[]>(() =>
    loadSlotColors(),
  );
  const [slotCursor, setSlotCursor] = useState(0);
  const [pos, setPos] = useState(position);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  const voteEntries: VoteEntry[] = Object.entries(votes)
    .filter(([key]) => key.startsWith(`${selectedCell.id}:`))
    .map(([key, count]) => {
      const [cellIdStr, entryColor] = key.split(":");
      const cellId = parseInt(cellIdStr);
      const cell = cells.find((c) => c.id === cellId);

      return {
        cellId,
        x: cell?.x ?? 0,
        y: cell?.y ?? 0,
        color: entryColor,
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  const maxCount = voteEntries[0]?.count ?? 1;
  const isVoteDisabled = !roundId || loading || isRoundExpired;

  const buttonLabel = isRoundExpired
    ? "투표 마감"
    : loading
      ? "투표 중..."
      : "투표하기";

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    onColorChange(newColor);
  };

  const handleVoteEntryClick = (entryColor: string) => {
    handleColorChange(entryColor);
  };

  const handleSlotAdd = () => {
    setSlotColors((prev) => {
      const next = [...prev];
      next[slotCursor] = color;
      return next;
    });
    setSlotCursor((prev) => (prev + 1) % SLOT_COUNT);
  };

  const handleSlotReset = () => {
    setSlotColors(INITIAL_SLOTS);
    setSlotCursor(0);
  };

  const handleSlotSelect = (slotColor: string, slotIndex: number) => {
    setSlotCursor(slotIndex);

    if (!slotColor) return;
    handleColorChange(slotColor);
  };

  const handleSubmit = async () => {
    if (!roundId) return;

    if (isRoundExpired) {
      setError("이 라운드 투표가 마감되었습니다.");
      return;
    }

    setError("");
    setLoading(true);

    window.localStorage.setItem(STORAGE_KEYS.lastVotedColor, color);

    try {
      await voteApi.submit({
        canvasId,
        roundId,
        cellId: selectedCell.id,
        color,
      });

      onColorChange(null);
      onVoteSuccess();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(
          axiosErr.response?.data?.message ?? "투표 중 오류가 발생했어요.",
        );
      } else {
        setError("투표 중 오류가 발생했어요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.stopPropagation();
  };

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.slotColors,
      JSON.stringify(slotColors),
    );
  }, [slotColors]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (!popupRef.current) return;

    const popup = popupRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = position;

    if (x + popup.width > vw) x = vw - popup.width - 8;
    if (y + popup.height > vh) y = vh - popup.height - 8;
    if (x < 0) x = 8;
    if (y < 0) y = 8;

    setPos({ x, y });
  }, [position]);

  useEffect(() => {
    onColorChange(color);
    return () => onColorChange(null);
  }, []);

  useEffect(() => {
    if (isRoundExpired) {
      setLoading(false);
      setError("");
      return;
    }

    setError("");
  }, [isRoundExpired]);

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-lg"
      style={{ top: pos.y, left: pos.x }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex cursor-move select-none items-center justify-between border-b border-gray-100 px-4 py-3"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-5 shrink-0 cursor-pointer rounded border border-gray-300"
            style={
              selectedCell.color
                ? { backgroundColor: selectedCell.color }
                : {
                    backgroundColor: "#f9fafb",
                    backgroundImage: CHECKER_PATTERN,
                    backgroundPosition: "0 0, 4px 4px",
                    backgroundSize: "8px 8px",
                  }
            }
            onClick={(e) => {
              e.stopPropagation();
              if (selectedCell.color) handleColorChange(selectedCell.color);
            }}
          />
          <p className="text-sm font-semibold">
            ({selectedCell.x}, {selectedCell.y})
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-lg leading-none text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {voteEntries.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium">득표 현황</p>
            <div className="flex max-h-[72px] flex-col gap-1 overflow-y-auto">
              {voteEntries.map(({ color: entryColor, count }) => (
                <button
                  key={entryColor}
                  className="flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVoteEntryClick(entryColor);
                  }}
                >
                  <div
                    className="h-3 w-3 shrink-0 rounded-sm border border-gray-200"
                    style={{ backgroundColor: entryColor }}
                  />
                  <span className="w-14 shrink-0 text-left text-xs text-gray-500">
                    {entryColor}
                  </span>
                  <div className="h-2 flex-1 rounded bg-gray-100">
                    <div
                      className="h-2 rounded transition-all"
                      style={{
                        width: `${(count / maxCount) * 100}%`,
                        backgroundColor: entryColor,
                      }}
                    />
                  </div>
                  <span className="w-4 shrink-0 text-right text-xs text-gray-500">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <ColorPalette
          selected={color}
          onChange={handleColorChange}
          slotColors={slotColors}
          slotCursor={slotCursor}
          onSlotAdd={handleSlotAdd}
          onSlotReset={handleSlotReset}
          onSlotSelect={handleSlotSelect}
        />

        {error && !isRoundExpired && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleSubmit();
          }}
          disabled={isVoteDisabled}
          className="w-full"
          size="sm"
        >
          {buttonLabel}
        </Button>

        {isRoundExpired && (
          <p className="text-center text-xs text-red-500">
            이 라운드 투표가 마감되었습니다.
          </p>
        )}

        {error && isRoundExpired && (
          <p className="text-center text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
