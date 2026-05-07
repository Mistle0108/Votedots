import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Cell } from "@/features/gameplay/canvas";
import {
  GAME_PHASE,
  type GamePhase,
} from "@/features/gameplay/session/model/game-phase.types";
import { useI18n } from "@/shared/i18n";
import { translateServerMessage } from "@/shared/i18n/server-messages";
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
  loadLastPaletteColor,
  loadSlotColors,
} from "../model/vote.utils";
import ColorPalette from "./ColorPalette";

interface Props {
  canvasId: number;
  roundId: number | null;
  phase: GamePhase;
  isRoundExpired: boolean;
  remaining: number | null;
  selectedCell: Cell;
  votes: Record<string, number>;
  position: { x: number; y: number };
  onVoteSuccess: (color: string) => void;
  onColorChange: (color: string | null) => void;
  onClose: () => void;
}

const INITIAL_POINTER_OFFSET_X = 190;
const INITIAL_POINTER_OFFSET_Y = 120;

function getPhaseBlockedMessage(
  phase: GamePhase,
  translate: (key: string) => string,
): string {
  switch (phase) {
    case GAME_PHASE.INTRO:
      return translate("vote.popup.blockedIntro");
    case GAME_PHASE.ROUND_START_WAIT:
      return translate("vote.popup.blockedStartWait");
    case GAME_PHASE.ROUND_RESULT:
      return translate("vote.popup.blockedResult");
    case GAME_PHASE.GAME_END:
      return translate("vote.popup.blockedGameEnd");
    case GAME_PHASE.ROUND_ACTIVE:
      return "";
  }
}

function getButtonLabel(
  phase: GamePhase,
  isRoundExpired: boolean,
  loading: boolean,
  translate: (key: string) => string,
): string {
  if (phase !== GAME_PHASE.ROUND_ACTIVE) {
    return translate("vote.popup.disabled");
  }

  if (isRoundExpired) {
    return translate("vote.popup.closed");
  }

  if (loading) {
    return translate("vote.popup.loading");
  }

  return translate("vote.popup.submit");
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
  remaining,
  selectedCell,
  votes,
  position,
  onVoteSuccess,
  onColorChange,
  onClose,
}: Props) {
  const { locale, t } = useI18n();
  const [color, setColor] = useState(() => loadLastPaletteColor());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotColors, setSlotColors] = useState<string[]>(() =>
    loadSlotColors(),
  );
  const [slotCursor, setSlotCursor] = useState(0);
  const [pos, setPos] = useState(position);

  const isDragging = useRef(false);
  const hasManualPositionRef = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  const voteEntries = buildVotePopupEntries(
    votes,
    selectedCell.x,
    selectedCell.y,
  );
  const maxCount = voteEntries[0]?.count ?? 1;
  const isVotingPhase = phase === GAME_PHASE.ROUND_ACTIVE;
  const phaseBlockedMessage = getPhaseBlockedMessage(phase, t);
  const canSubmitVote = isVotingPhase && !isRoundExpired;
  const hasRemainingVotes = remaining !== null ? remaining > 0 : true;
  const visibleLoading = loading && canSubmitVote;
  const visibleError = canSubmitVote ? error : "";
  const isVoteDisabled =
    !roundId || !canSubmitVote || !hasRemainingVotes || visibleLoading;

  const buttonLabel = getButtonLabel(
    phase,
    isRoundExpired,
    visibleLoading,
    t,
  );

  const handleColorChange = (nextColor: string) => {
    window.localStorage.setItem(STORAGE_KEYS.lastPaletteColor, nextColor);
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
      setError(t("vote.popup.roundClosed"));
      return;
    }

    setError("");
    setLoading(true);

    try {
      await voteApi.submit({
        canvasId,
        roundId,
        x: selectedCell.x,
        y: selectedCell.y,
        color,
      });

      onVoteSuccess(color);
      onColorChange(null);
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(
          translateServerMessage(
            axiosErr.response?.data?.message ?? t("vote.popup.submitError"),
            t,
            locale,
          ),
        );
      } else if (err instanceof Error) {
        setError(translateServerMessage(err.message, t, locale));
      } else {
        setError(t("vote.popup.submitError"));
      }
    } finally {
      setLoading(false);
    }
  }, [
    roundId,
    isVotingPhase,
    phaseBlockedMessage,
    isRoundExpired,
    locale,
    t,
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
    hasManualPositionRef.current = true;
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

  useLayoutEffect(() => {
    if (!popupRef.current) {
      return;
    }

    if (hasManualPositionRef.current) {
      return;
    }

    const popup = popupRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let x = position.x + INITIAL_POINTER_OFFSET_X;
    let y = position.y - INITIAL_POINTER_OFFSET_Y;

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
  }, [position, error, phaseBlockedMessage, isVotingPhase]);

  useEffect(() => {
    hasManualPositionRef.current = false;
  }, [position.x, position.y, selectedCell.x, selectedCell.y]);

  useEffect(() => {
    onColorChange(color);
  }, [color, onColorChange, selectedCell.x, selectedCell.y]);

  useEffect(() => {
    return () => onColorChange(null);
  }, [onColorChange]);

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

      event.preventDefault();

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
      className="fixed z-50 w-64 rounded-xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-elevated)] shadow-lg"
      style={{ top: pos.y, left: pos.x }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="flex cursor-move select-none items-center justify-between border-b border-[color:var(--page-theme-border-secondary)] px-4 py-3"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-5 shrink-0 cursor-pointer rounded border border-[color:var(--page-theme-border-secondary)]"
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
          <p className="text-sm font-semibold text-[color:var(--page-theme-text-primary)]">
            ({selectedCell.x}, {selectedCell.y})
          </p>
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="text-lg leading-none text-[color:var(--page-theme-text-tertiary)] hover:text-[color:var(--page-theme-text-primary)]"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {voteEntries.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-[color:var(--page-theme-text-secondary)]">
              {t("vote.popup.liveStatus")}
            </p>
            <div className="flex max-h-[72px] flex-col gap-1 overflow-y-auto">
              {voteEntries.map(({ color: entryColor, count }) => (
                <button
                  key={entryColor}
                  className="flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-[color:var(--page-theme-surface-secondary)]"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleColorChange(entryColor);
                  }}
                >
                  <div
                    className="h-3 w-3 shrink-0 rounded-sm border border-[color:var(--page-theme-border-secondary)]"
                    style={{ backgroundColor: entryColor }}
                  />
                  <span className="w-14 shrink-0 text-left text-xs text-[color:var(--page-theme-text-secondary)]">
                    {entryColor}
                  </span>
                  <div className="h-2 flex-1 rounded bg-[color:var(--page-theme-surface-secondary)]">
                    <div
                      className="h-2 rounded transition-all"
                      style={{
                        width: `${(count / maxCount) * 100}%`,
                        backgroundColor: entryColor,
                      }}
                    />
                  </div>
                  <span className="w-4 shrink-0 text-right text-xs text-[color:var(--page-theme-text-secondary)]">
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
          <p className="text-sm text-[color:var(--page-theme-text-secondary)]">
            {phaseBlockedMessage}
          </p>
        )}

        {visibleError && (
          <p className="text-sm text-[color:var(--page-theme-alert)]">{visibleError}</p>
        )}
      </div>
    </div>
  );
}
