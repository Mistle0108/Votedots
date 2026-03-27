import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import ColorPalette from "./ColorPalette";
import { voteApi } from "@/api/vote";
import { Cell } from "@/types/canvas";

const SLOT_COUNT = 12;
const INITIAL_SLOTS = Array(SLOT_COUNT).fill("#ffffff");

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
  const [slotColors, setSlotColors] = useState<string[]>(INITIAL_SLOTS);
  const [slotCursor, setSlotCursor] = useState(0);
  const [pos, setPos] = useState(position);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  // 득표 현황 — 해당 셀 기준, 전체 목록
  const voteEntries: VoteEntry[] = Object.entries(votes)
    .filter(([key]) => key.startsWith(`${selectedCell.id}:`))
    .map(([key, count]) => {
      const [cellIdStr, color] = key.split(":");
      const cellId = parseInt(cellIdStr);
      const cell = cells.find((c) => c.id === cellId);
      return { cellId, x: cell?.x ?? 0, y: cell?.y ?? 0, color, count };
    })
    .sort((a, b) => b.count - a.count);

  const maxCount = voteEntries[0]?.count ?? 1;

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    onColorChange(newColor);
  };

  const handleVoteEntryClick = (entryColor: string) => {
    handleColorChange(entryColor);
  };

  // 슬롯 커서 위치에 현재 색상 추가 후 커서 이동
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

  const handleSlotSelect = (slotColor: string) => {
    handleColorChange(slotColor);
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
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
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
    const handleMouseUp = () => { isDragging.current = false; };
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
      {/* 헤더 — painted 색상 + 좌표 + 닫기 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 cursor-move select-none"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          {/* painted 색상 아이콘 — 클릭 시 색상 선택 */}
          <div
            className="w-5 h-5 rounded border border-gray-300 shrink-0 cursor-pointer"
            style={{ backgroundColor: selectedCell.color ?? "#e5e7eb" }}
            onClick={(e) => {
              e.stopPropagation();
              if (selectedCell.color) handleColorChange(selectedCell.color);
            }}
          />
          <p className="font-semibold text-sm">
            ({selectedCell.x}, {selectedCell.y})
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* 득표 현황 — 3개 고정 높이 + 스크롤 */}
        {voteEntries.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">득표 현황</p>
            <div className="flex flex-col gap-1 max-h-[72px] overflow-y-auto">
              {voteEntries.map(({ color: c, count }) => (
                <button
                  key={c}
                  className="flex items-center gap-2 w-full hover:bg-gray-50 rounded px-1 py-0.5"
                  onClick={(e) => { e.stopPropagation(); handleVoteEntryClick(c); }}
                >
                  <div
                    className="w-3 h-3 rounded-sm shrink-0 border border-gray-200"
                    style={{ backgroundColor: c }}
                  />
                  <span className="text-xs text-gray-500 w-14 shrink-0 text-left">
                    {c}
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
        <ColorPalette
          selected={color}
          onChange={handleColorChange}
          slotColors={slotColors}
          slotCursor={slotCursor}
          onSlotAdd={handleSlotAdd}
          onSlotReset={handleSlotReset}
          onSlotSelect={handleSlotSelect}
        />

        {error && <p className="text-xs text-red-500">{error}</p>}

        <Button
          onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
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