import { useEffect, type MouseEvent } from "react";
import type { RoundSummaryData } from "@/features/gameplay/session/api/session.api";
import { useI18n } from "@/shared/i18n";

interface RoundSummaryModalProps {
  open: boolean;
  summary: RoundSummaryData | null;
  snapshot: string | null;
  position: { x: number; y: number };
  onClose: () => void;
  onDragStart: (event: MouseEvent<HTMLDivElement>) => void;
}

function hasMostVotedCell(summary: RoundSummaryData) {
  return (
    typeof summary.mostVotedCellX === "number" &&
    typeof summary.mostVotedCellY === "number"
  );
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
        </span>
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
  position,
  onClose,
  onDragStart,
}: RoundSummaryModalProps) {
  const { formatPercent, locale, t } = useI18n();

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

  const progressPercent =
    summary.totalCellCount > 0
      ? (
        (summary.currentPaintedCellCount / summary.totalCellCount) *
        100
      ).toFixed(1)
      : "0.0";
  const roundSnapshot = summary.snapshotUrl ?? snapshot;

  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="pointer-events-auto fixed flex max-h-[calc(100vh-48px)] w-[560px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-elevated)] shadow-2xl backdrop-blur"
        style={{ top: position.y, left: position.x }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="relative flex cursor-move items-center justify-center border-b border-[color:var(--page-theme-border-secondary)] px-5 py-4"
          onMouseDown={onDragStart}
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
              <div
                className="mx-auto w-1/2 min-w-[180px] rounded-2xl border border-[color:var(--page-theme-border-primary)] p-3 shadow-sm"
                style={{
                  backgroundColor: "var(--page-theme-surface-secondary)",
                }}
              >
                <img
                  src={roundSnapshot}
                  alt={t("roundSummary.snapshotAlt", {
                    round: summary.roundNumber,
                  })}
                  className="block w-full rounded border border-[color:var(--page-theme-border-secondary)] bg-transparent"
                  style={{ imageRendering: "pixelated" }}
                  draggable={false}
                  onDragStart={(event) => {
                    event.preventDefault();
                  }}
                />
              </div>
            )}

            <section className="space-y-3 text-left text-[15px] font-bold leading-7 text-[color:var(--page-theme-text-secondary)]">
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
                </span>
                {t("roundSummary.paintedCells")}
              </p>
              <p>
                {t("roundSummary.progress")}{" "}
                <span className="text-[22px] text-[color:var(--page-theme-alert)]">
                  {formatPercent(progressPercent)}
                </span>
              </p>
            </section>

            <section className="space-y-3 rounded-2xl border border-[color:var(--page-theme-border-secondary)] bg-[color:var(--page-theme-surface-secondary)] px-5 py-4 text-sm leading-6 text-[color:var(--page-theme-text-secondary)]">
              {hasMostVotedCell(summary) ? (
                <p>
                  {t("roundSummary.mostPopularPrefix")} (
                  {summary.mostVotedCellX}, {summary.mostVotedCellY})
                  {t("roundSummary.mostPopularSuffix")}
                </p>
              ) : (
                <p>{t("roundSummary.noPopularCell")}</p>
              )}
              <p>
                {t("roundSummary.randomResolvedPrefix")}{" "}
                {summary.randomResolvedCellCount > 0 ? (
                  <>
                    <span className="font-bold text-[color:var(--page-theme-text-primary)]">
                      {summary.randomResolvedCellCount}
                    </span>
                    {t("roundSummary.randomResolvedSuffix")}
                  </>
                ) : (
                  t("common.none")
                )}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
