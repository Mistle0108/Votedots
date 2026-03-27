import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import ColorPalette from "./ColorPalette";
import { voteApi } from "@/api/vote";
import { Cell } from "@/types/canvas";

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
  selectedCell: Cell;
  votes: Record<string, number>;
  cells: Cell[];
  position: { x: number; y: number };
  onVoteSuccess: (color: string) => void;
  onColorChange: (color: string | null) => void;
  onClose: () => void;
}

export default function VotePopup({
  canvasId,
  roundId,
  selectedCell,
  votes,
  cells,
  position,
  onVoteSuccess,
  onColorChange,
  onClose,
}: Props) {
  const [color, setColor] = useState("#000000");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usedColors, setUsedColors] = useState<string[]>([]);
  const [pos, setPos] = useState(position);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // 득표 현황 — 해당 셀 기준 필터링, 좌표 표시, 상위 3개
  const voteEntries: VoteEntry[] = Object.entries(votes)
    .filter(([key]) => key.startsWith(`${selectedCell.id}:`))
    .map(([key, count]) => {
      const [cellIdStr, color] = key.split(":");
      const cellId = parseInt(cellIdStr);
      const cell = cells.find((c) => c.id === cellId);
      return { cellId, x: cell?.x ?? 0, y: cell?.y ?? 0, color, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const maxCount = voteEntries[0]?.count ?? 1;

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    onColorChange(newColor);
  };

  const handleVoteEntryClick = (entryColor: string) => {
    handleColorChange(entryColor);
  };

  const handleSubmit = async () => {
    if (!roundId) return;
    setError("");
    setLoading(true);
    try {
      await voteApi.submit({
        canvasId,
        roundId,
        cellId: selectedCell.id,
        color,
      });
      onColorChange(null);
      onVoteSuccess(color);
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response: { data: { message: string } } };
        setError(axiosErr.response.data.message);
      } else {
        setError("투표 중 오류가 발생했어요");
      }
    } finally {
      setLoading(false);
    }
  };

  // 드래그 이동
  const handleDragStart = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    e.stopPropagation();
  };

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

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // 화면 밖 위치 보정
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
  }, []);

  // 초기 색상 미리보기
  useEffect(() => {
    onColorChange(color);
    return () => onColorChange(null);
  }, []);

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-64"
      style={{ top: pos.y, left: pos.x }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 cursor-move select-none"
        onMouseDown={handleDragStart}
      >
        <p className="font-semibold text-sm">셀 투표</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* 좌표 */}
        <p className="text-xs text-gray-500">
          X: {selectedCell.x}, Y: {selectedCell.y}
        </p>

        {/* 득표 현황 — 상위 3개, 좌표 표시 */}
        {voteEntries.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">득표 현황</p>
            <div className="flex flex-col gap-1">
              {voteEntries.map(({ x, y, color: c, count }) => (
                <button
                  key={c}
                  className="flex items-center gap-2 w-full hover:bg-gray-50 rounded px-1 py-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVoteEntryClick(c);
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-sm shrink-0 border border-gray-200"
                    style={{ backgroundColor: c }}
                  />
                  <span className="text-xs text-gray-500 w-14 shrink-0 text-left">
                    ({x}, {y})
                  </span>
                  <div className="flex-1 bg-gray-100 rounded h-2">
                    <div
                      className="h-2 rounded transition-all"
                      style={{
                        width: `${(count / maxCount) * 100}%`,
                        backgroundColor: c,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-4 shrink-0 text-right">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 색상 선택 */}
        <div>
          <p className="text-xs font-medium mb-2">색상 선택</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <div
                className="w-7 h-7 rounded border border-gray-200 cursor-pointer shrink-0"
                style={{ backgroundColor: color }}
                onClick={(e) => {
                  e.stopPropagation();
                  colorInputRef.current?.click();
                }}
              />
              <input
                ref={colorInputRef}
                type="color"
                value={color}
                onChange={(e) => {
                  e.stopPropagation();
                  handleColorChange(e.target.value);
                }}
                className="absolute opacity-0 w-0 h-0"
              />
            </div>
            <input
              type="text"
              value={color}
              onChange={(e) => {
                e.stopPropagation();
                handleColorChange(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 border rounded px-2 py-1 text-xs"
            />
          </div>
          <ColorPalette
            selected={color}
            onChange={handleColorChange}
            extraColors={usedColors}
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleSubmit();
          }}
          disabled={!roundId || loading}
          className="w-full"
          size="sm"
        >
          {loading ? "투표 중..." : "투표하기"}
        </Button>
      </div>
    </div>
  );
}
