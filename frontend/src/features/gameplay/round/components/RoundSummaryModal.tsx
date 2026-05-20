import { useEffect, type MouseEvent } from "react";
import type { RoundSummaryData } from "@/features/gameplay/session/api/session.api";
import {
  HISTORY_PANEL_WIDTH,
  RIGHT_PANEL_ACTIONS_EXPOSED_HEIGHT,
} from "@/pages/canvas/model/modal-position";
import { useSwipeDownDismiss } from "@/shared/hooks/use-swipe-down-dismiss";
import { useI18n } from "@/shared/i18n";
import { PixelSnapshotPreview } from "@/shared/ui/pixel-snapshot-preview";

interface RoundSummaryModalProps {
  open: boolean;
  summary: RoundSummaryData | null;
  snapshot: string | null;
  playBackgroundImageUrl: string | null;
  snapshotMaxLongestSide?: number;
  centerOnScreen?: boolean;
  mobileLayout?: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onDragStart: (event: MouseEvent<HTMLDivElement>) => void;
}

function renderParticipantCopy(
  count: number,
  translate: (key: string, params?: Record<string, string | number>) => string,
  locale: "ko" | "en",
) {
  if (count > 0) {
    return (
      <>
        <span className="text-[22px] text-[color:var(--page-theme-alert)]">
          {count}
        </span>{" "}
        {count === 1 && locale === "en"
          ? translate("roundSummary.participantVotedSingular")
          : translate("roundSummary.participantsVoted")}
      </>
    );
  }

  return translate("roundSummary.noParticipants");
}

export default function RoundSummaryModal({
  open,
  summary,
  snapshot,
  playBackgroundImageUrl,
  snapshotMaxLongestSide = 512,
  centerOnScreen = false,
  mobileLayout = false,
  position,
  onClose,
  onDragStart,
}: RoundSummaryModalProps) {
  const { locale, t } = useI18n();
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  } = useSwipeDownDismiss({
    onDismiss: onClose,
  });

  useEffect(() => {
    if (!open || !summary) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, summary]);

  if (!open || !summary) {
    return null;
  }

  const roundSnapshot = summary.snapshotUrl ?? snapshot;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={
        mobileLayout
          ? {
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
              paddingRight: "calc(env(safe-area-inset-right, 0px) + 12px)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
              paddingLeft: "calc(env(safe-area-inset-left, 0px) + 12px)",
            }
          : undefined
      }
    >
      <div
        className={
          centerOnScreen
            ? "pointer-events-auto fixed inset-0"
            : "pointer-events-auto fixed bottom-0 right-0"
        }
        style={
          centerOnScreen
            ? mobileLayout
              ? {
                  inset: 0,
                }
              : undefined
            : {
                top: `${RIGHT_PANEL_ACTIONS_EXPOSED_HEIGHT}px`,
                left: `${HISTORY_PANEL_WIDTH}px`,
              }
        }
        onMouseDown={(event) => event.stopPropagation()}
        onClick={mobileLayout ? onClose : (event) => event.stopPropagation()}
      />

      <div
        className={`pointer-events-auto fixed flex max-h-[calc(100dvh-48px)] w-[700px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] shadow-2xl ${
          centerOnScreen
            ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            : ""
        }`}
        style={
          centerOnScreen
            ? mobileLayout
              ? {
                  left: "50%",
                  top: "50%",
                  width: "min(92vw, 700px)",
                }
              : undefined
            : { top: position.y, left: position.x }
        }
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="relative flex cursor-move items-center justify-center border-b border-[color:var(--page-theme-border-secondary)] px-5 py-4"
          onMouseDown={mobileLayout ? undefined : onDragStart}
          onTouchStart={mobileLayout ? handleTouchStart : undefined}
          onTouchMove={mobileLayout ? handleTouchMove : undefined}
          onTouchEnd={mobileLayout ? handleTouchEnd : undefined}
          onTouchCancel={mobileLayout ? handleTouchCancel : undefined}
        >
          <p className="text-center text-lg font-bold text-[color:var(--page-theme-primary-action)]">
            {t("roundSummary.title", { round: summary.roundNumber })}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--page-theme-text-tertiary)] hover:bg-[color:var(--page-theme-surface-secondary)] hover:text-[color:var(--page-theme-text-primary)]"
            aria-label={t("roundSummary.close")}
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            {roundSnapshot && (
              <PixelSnapshotPreview
                snapshotUrl={roundSnapshot}
                alt={t("roundSummary.snapshotAlt", {
                  round: summary.roundNumber,
                })}
                backgroundImageUrl={playBackgroundImageUrl}
                backgroundAlt="Round summary play background"
                maxLongestSide={snapshotMaxLongestSide}
              />
            )}

            <section className="mx-auto w-4/6 space-y-3 rounded-2xl border-2 border-[color:var(--page-theme-primary-action)] px-5 py-4 text-center text-[15px] font-bold leading-7 text-[color:var(--page-theme-text-primary)]">
              <p>{renderParticipantCopy(summary.participantCount, t, locale)}</p>
              <p>
                <span className="text-[22px] text-[color:var(--page-theme-alert)]">
                  {summary.totalVotes}
                </span>{" "}
                {t("roundSummary.totalVotes")}
              </p>
              <p>
                <span className="text-[22px] text-[color:var(--page-theme-alert)]">
                  {summary.paintedCellCount}
                </span>{" "}
                {t("roundSummary.paintedCells")}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
