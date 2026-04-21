import { useCallback, useEffect, useRef, useState } from "react";
import type { Cell } from "@/features/gameplay/canvas";
import {
  GAME_PHASE,
  type GamePhase,
} from "@/features/gameplay/session/model/game-phase.types";
import { Button } from "@/shared/ui/button";
import { voteApi } from "../api/vote.api";
import {
  CHECKER_PATTERN,
  INITIAL_SLOTS,
  SLOT_COUNT,
  STORAGE_KEYS,
} from "../model/vote.constants";
import {
  buildVotePopupEntries,
  loadLastVotedColor,
  loadSlotColors,
} from "../model/vote.utils";
import ColorPalette from "./ColorPalette";

interface Props {
  canvasId: number;
  roundId: number | null;
  phase: GamePhase;
  isRoundExpired: boolean;
  selectedCell: Cell;
  votes: Record<string, number>;
  cells: Cell[];
  position: { x: number; y: number };
  onVoteSuccess: () => void;
  onColorChange: (color: string | null) => void;
  onClose: () => void;
}

function getPhaseBlockedMessage(phase: GamePhase): string {
  switch (phase) {
    case GAME_PHASE.INTRO:
      return "게임 시작 안내 중에는 투표할 수 없어요.";
    case GAME_PHASE.ROUND_START_WAIT:
      return "라운드 시작 대기 중에는 투표할 수 없어요.";
    case GAME_PHASE.ROUND_RESULT:
      return "결과 집계 중에는 투표할 수 없어요.";
    case GAME_PHASE.GAME_END:
      return "게임이 종료되어 투표할 수 없어요.";
    case GAME_PHASE.ROUND_ACTIVE:
      return "";
  }
}

function getButtonLabel(
  phase: GamePhase,
  isRoundExpired: boolean,
  loading: boolean,
): string {
  if (phase !== GAME_PHASE.ROUND_ACTIVE) {
    return "투표 불가";
  }

  if (isRoundExpired) {
    return "투표 마감";
  }

  if (loading) {
    return "투표 중...";
  }

  return "투표하기";
}

function isTextInputElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;

  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}

export default function VotePopup({
  canvasId,
  roundId,
  phase,
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

  const voteEntries = buildVotePopupEntries(
    votes,
    selectedCell.x,
    selectedCell.y,
    cells,
  );
  const maxCount = voteEntries[0]?.count ?? 1;
  const isVotingPhase = phase === GAME_PHASE.ROUND_ACTIVE;
  const phaseBlockedMessage = getPhaseBlockedMessage(phase);
  const isVoteDisabled =
    !roundId || !isVotingPhase || loading || isRoundExpired;

  const buttonLabel = getButtonLabel(phase, isRoundExpired, loading);

  const handleColorChange = (nextColor: string) => {
    setColor(nextColor);
    onColorChange(nextColor);
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

    if (!slotColor) {
      return;
    }

    handleColorChange(slotColor);
  };

  const handleSubmit = useCallback(async () => {
    if (!roundId) {
      return;
    }

    if (!isVotingPhase) {
      setError(phaseBlockedMessage);
      return;
    }

    if (isRoundExpired) {
      setError("현재 라운드의 투표가 마감되었어요.");
      return;
    }

    setError("");
    setLoading(true);

    window.localStorage.setItem(STORAGE_KEYS.lastVotedColor, color);

    try {
      await voteApi.submit({
        canvasId,
        roundId,
        x: selectedCell.x,
        y: selectedCell.y,
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
  }, [
    roundId,
    isVotingPhase,
    phaseBlockedMessage,
    isRoundExpired,
    color,
    canvasId,
    selectedCell.x,
    selectedCell.y,
    onColorChange,
    onVoteSuccess,
    onClose,
  ]);

  const handleDragStart = (event: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = {
      x: event.clientX - pos.x,
      y: event.clientY - pos.y,
    };
    event.stopPropagation();
  };

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.slotColors,
      JSON.stringify(slotColors),
    );
  }, [slotColors]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging.current) {
        return;
      }

      setPos({
        x: event.clientX - dragOffset.current.x,
        y: event.clientY - dragOffset.current.y,
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
    let isActivated = false;

    const rafId = window.requestAnimationFrame(() => {
      isActivated = true;
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (!isActivated) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (popupRef.current?.contains(target)) {
        return;
      }

      // 메인 보드 canvas, paint canvas, minimap canvas 클릭은
      // 선택 유지/이동 동작으로 보고 팝업 close 처리하지 않음
      if (target.closest("canvas")) {
        return;
      }

      onClose();
    };

    window.addEventListener("mousedown", handleClickOutside, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [onClose]);

  useEffect(() => {
    if (!popupRef.current) {
      return;
    }

    const popup = popupRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let { x, y } = position;

    if (x + popup.width > viewportWidth) {
      x = viewportWidth - popup.width - 8;
    }
    if (y + popup.height > viewportHeight) {
      y = viewportHeight - popup.height - 8;
    }
    if (x < 0) {
      x = 8;
    }
    if (y < 0) {
      y = 8;
    }

    setPos({ x, y });
  }, [position]);

  useEffect(() => {
    onColorChange(color);
    return () => onColorChange(null);
  }, []);

  useEffect(() => {
    if (!isVotingPhase || isRoundExpired) {
      setLoading(false);
    }

    setError("");
  }, [isRoundExpired, isVotingPhase]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.code !== "Space") {
        return;
      }

      if (isTextInputElement(event.target)) {
        return;
      }

      event.preventDefault(); // 변경: 모달이 열려 있으면 스페이스 기본 스크롤 차단

      if (event.repeat) {
        return;
      }

      if (isVoteDisabled) {
        return;
      }

      void handleSubmit();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSubmit, isVoteDisabled, onClose]);

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-lg"
      style={{ top: pos.y, left: pos.x }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
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
            onClick={(event) => {
              event.stopPropagation();
              if (selectedCell.color) {
                handleColorChange(selectedCell.color);
              }
            }}
          />
          <p className="text-sm font-semibold">
            ({selectedCell.x}, {selectedCell.y})
          </p>
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
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
            <p className="mb-2 text-xs font-medium">실시간 현황</p>
            <div className="flex max-h-[72px] flex-col gap-1 overflow-y-auto">
              {voteEntries.map(({ color: entryColor, count }) => (
                <button
                  key={entryColor}
                  className="flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleColorChange(entryColor);
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

        <Button
          type="button"
          className="w-full"
          disabled={isVoteDisabled}
          onClick={handleSubmit}
        >
          {buttonLabel}
        </Button>

        {!isVotingPhase && (
          <p className="text-sm text-gray-500">{phaseBlockedMessage}</p>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
