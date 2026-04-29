import { useEffect, type ReactNode } from "react";
import type {
  GameSummaryData,
  GameSummaryParticipant,
  GameSummaryTopVoter,
} from "@/features/gameplay/session/api/session.api";
import { useI18n } from "@/shared/i18n";
import { useSnapshotDownload } from "@/shared/hooks/useSnapshotDownload";

interface GameSummaryModalProps {
  summary: GameSummaryData;
  snapshotUrl?: string | null;
  onClose: () => void;
}

function HighlightNumber({ children }: { children: ReactNode }) {
  return (
    <span className="text-[19px] font-bold text-[color:var(--page-theme-alert)]">
      {children}
    </span>
  );
}

function NumberText({
  value,
  formatNumber,
}: {
  value: number | null | undefined;
  formatNumber: (value: number | null | undefined) => string;
}) {
  return <HighlightNumber>{formatNumber(value)}</HighlightNumber>;
}

function PercentText({
  value,
  formatPercent,
}: {
  value: string | number | null | undefined;
  formatPercent: (value: number | string | null | undefined) => string;
}) {
  return <HighlightNumber>{formatPercent(value)}</HighlightNumber>;
}

function CellCoordinate({
  summary,
  formatNumber,
}: {
  summary: GameSummaryData;
  formatNumber: (value: number | null | undefined) => string;
}) {
  if (
    typeof summary.mostVotedCellX !== "number" ||
    typeof summary.mostVotedCellY !== "number"
  ) {
    return <span>-</span>;
  }

  return (
    <>
      (
      <NumberText value={summary.mostVotedCellX} formatNumber={formatNumber} />,{" "}
      <NumberText value={summary.mostVotedCellY} formatNumber={formatNumber} />
      )
    </>
  );
}

function VoterName({
  voter,
}: {
  voter: GameSummaryTopVoter | GameSummaryParticipant;
}) {
  return voter.name;
}

function VoterList({
  voters,
  emptyLabel = "-",
  limit = 6,
  listStyle = "inline",
}: {
  voters: Array<GameSummaryTopVoter | GameSummaryParticipant> | null;
  emptyLabel?: string;
  limit?: number;
  listStyle?: "inline" | "list";
}) {
  if (!voters || voters.length === 0) {
    return <span>{emptyLabel}</span>;
  }

  const visibleVoters = voters.slice(0, limit);

  if (listStyle === "list") {
    return (
      <ul className="space-y-1">
        {visibleVoters.map((voter) => (
          <li key={voter.voterId} className="list-none">
            - <VoterName voter={voter} />
          </li>
        ))}
        {voters.length > limit ? <li className="list-none">- ...</li> : null}
      </ul>
    );
  }

  return (
    <>
      {visibleVoters.map((voter, index) => (
        <span key={voter.voterId}>
          {index > 0 ? ", " : ""}
          <VoterName voter={voter} />
        </span>
      ))}
      {voters.length > limit ? ", ..." : ""}
    </>
  );
}

function ColorStat({
  color,
  count,
  formatNumber,
  emptyLabel = "-",
  wrapCount = false,
  suffix,
}: {
  color: string | null;
  count: number;
  formatNumber: (value: number | null | undefined) => string;
  emptyLabel?: string;
  wrapCount?: boolean;
  suffix: string;
}) {
  if (!color) {
    return (
      <span>
        {emptyLabel}
        {wrapCount ? " (" : " "}
        <NumberText value={0} formatNumber={formatNumber} />
        {suffix}
        {wrapCount ? ")" : ""}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span
        className="h-3 w-3 rounded-full border border-[color:var(--page-theme-border-secondary)]"
        style={{ backgroundColor: color }}
      />
      <span>
        {color}
        {wrapCount ? " (" : " "}
        <NumberText value={count} formatNumber={formatNumber} />
        {suffix}
        {wrapCount ? ")" : ""}
      </span>
    </span>
  );
}

function StatLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <span className="font-bold text-[color:var(--page-theme-text-primary)]">
        {label}:{" "}
      </span>
      {children}
    </p>
  );
}

function getVoteUnit(count: number | null | undefined, locale: "ko" | "en") {
  if (locale === "en") {
    return (count ?? 0) === 1 ? " vote" : " votes";
  }

  return "표";
}

function getCellUnit(count: number | null | undefined, locale: "ko" | "en") {
  if (locale === "en") {
    return (count ?? 0) === 1 ? " cell" : " cells";
  }

  return "칸";
}

export default function GameSummaryModal({
  summary,
  snapshotUrl,
  onClose,
}: GameSummaryModalProps) {
  const { formatNumber, formatPercent, locale, t } = useI18n();
  const finalSnapshotUrl = summary.snapshotUrl ?? snapshotUrl ?? null;
  const {
    canDownload: canDownloadDefaultSnapshot,
    isDownloading: isDownloadingDefaultSnapshot,
    downloadError: defaultDownloadError,
    download: downloadDefaultSnapshot,
    retry: retryDefaultSnapshot,
  } = useSnapshotDownload({
    snapshotUrl: summary.downloadSnapshotUrl,
    canvasId: summary.canvasId,
    endedAt: summary.endedAt,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  });
  const {
    canDownload: canDownloadHighResolutionSnapshot,
    isDownloading: isDownloadingHighResolutionSnapshot,
    downloadError: highResolutionDownloadError,
    download: downloadHighResolutionSnapshot,
    retry: retryHighResolutionSnapshot,
  } = useSnapshotDownload({
    snapshotUrl: summary.highResolutionDownloadSnapshotUrl,
    canvasId: summary.canvasId,
    endedAt: summary.endedAt,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    fileNameSuffix: "-hd",
  });

  useEffect(() => {
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
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--page-theme-overlay)] px-3 py-6"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="pointer-events-auto flex max-h-[min(calc(100vh-80px),680px)] w-[720px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-elevated)] shadow-2xl backdrop-blur"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex items-center justify-center border-b border-[color:var(--page-theme-border-secondary)] px-5 py-4">
          <p className="text-center text-lg font-bold text-[color:var(--page-theme-primary-action)]">
            {t("gameSummary.title")}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--page-theme-text-tertiary)] hover:bg-[color:var(--page-theme-surface-secondary)] hover:text-[color:var(--page-theme-text-primary)]"
            aria-label={t("gameSummary.close")}
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          <div className="space-y-5">
            {finalSnapshotUrl ? (
              <div
                className="mx-auto w-1/2 min-w-[180px] rounded-2xl border border-[color:var(--page-theme-border-primary)] p-3 shadow-sm"
                style={{
                  backgroundColor: "var(--page-theme-surface-secondary)",
                }}
              >
                <img
                  src={finalSnapshotUrl}
                  alt={t("gameSummary.snapshotAlt")}
                  className="block w-full rounded border border-[color:var(--page-theme-border-secondary)] bg-transparent"
                  style={{ imageRendering: "pixelated" }}
                  draggable={false}
                  onDragStart={(event) => {
                    event.preventDefault();
                  }}
                />
              </div>
            ) : (
              <div className="mx-auto flex aspect-square w-1/2 min-w-[180px] items-center justify-center rounded-2xl border border-dashed border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-secondary)] px-4 text-center text-sm font-medium text-[color:var(--page-theme-text-tertiary)]">
                {t("gameSummary.noSnapshot")}
              </div>
            )}

            {(canDownloadDefaultSnapshot || canDownloadHighResolutionSnapshot) && (
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {canDownloadDefaultSnapshot && (
                    <button
                      type="button"
                      onClick={
                        defaultDownloadError
                          ? retryDefaultSnapshot
                          : downloadDefaultSnapshot
                      }
                      disabled={isDownloadingDefaultSnapshot}
                      className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] px-4 py-2 text-sm font-semibold text-[color:var(--page-theme-text-primary)] transition hover:border-[color:var(--page-theme-primary-action)] hover:bg-[color:var(--page-theme-surface-secondary)] disabled:cursor-not-allowed disabled:border-[color:var(--page-theme-border-secondary)] disabled:bg-[color:var(--page-theme-surface-secondary)] disabled:text-[color:var(--page-theme-text-tertiary)]"
                    >
                      {isDownloadingDefaultSnapshot
                        ? t("gameSummary.downloading")
                        : defaultDownloadError
                          ? t("gameSummary.downloadRetry")
                          : t("gameSummary.download")}
                    </button>
                  )}

                  {canDownloadHighResolutionSnapshot && (
                    <button
                      type="button"
                      onClick={
                        highResolutionDownloadError
                          ? retryHighResolutionSnapshot
                          : downloadHighResolutionSnapshot
                      }
                      disabled={isDownloadingHighResolutionSnapshot}
                      className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-[color:var(--page-theme-primary-action)] px-4 py-2 text-sm font-semibold text-[color:var(--page-theme-primary-action-text)] transition hover:bg-[color:var(--page-theme-primary-action-hover)] disabled:cursor-not-allowed disabled:bg-[color:var(--page-theme-border-primary)]"
                    >
                      {isDownloadingHighResolutionSnapshot
                        ? t("gameSummary.downloadingHd")
                        : highResolutionDownloadError
                          ? t("gameSummary.downloadHdRetry")
                          : t("gameSummary.downloadHd")}
                    </button>
                  )}
                </div>

                {defaultDownloadError && (
                  <p className="text-sm font-medium text-[color:var(--page-theme-alert)]">
                    {defaultDownloadError}
                  </p>
                )}

                {highResolutionDownloadError && (
                  <p className="text-sm font-medium text-[color:var(--page-theme-alert)]">
                    {highResolutionDownloadError}
                  </p>
                )}
              </div>
            )}

            <section className="space-y-4 text-[15px] leading-7 text-[color:var(--page-theme-text-secondary)]">
              <div className="space-y-1 text-left">
                <StatLine label={t("gameSummary.stat.totalRounds")}>
                  {locale === "en" ? (
                    <NumberText
                      value={summary.totalRounds}
                      formatNumber={formatNumber}
                    />
                  ) : (
                    <>
                      <NumberText
                        value={summary.totalRounds}
                        formatNumber={formatNumber}
                      />{" "}
                      {t("gameSummary.text.roundsCompleted")}
                    </>
                  )}
                </StatLine>
                <StatLine label={t("gameSummary.stat.participants")}>
                  <NumberText
                    value={summary.participantCount}
                    formatNumber={formatNumber}
                  />{" "}
                  {locale === "en" && summary.participantCount === 1
                    ? t("gameSummary.text.participantJoinedSingular")
                    : t("gameSummary.text.participantsJoined")}
                </StatLine>
              </div>

              <div className="space-y-1 text-left">
                <StatLine label={t("gameSummary.stat.ticketUsage")}>
                  <PercentText
                    value={summary.ticketUsageRate}
                    formatPercent={formatPercent}
                  />
                </StatLine>
                <StatLine label={t("gameSummary.stat.issuedTickets")}>
                  {locale === "en" ? (
                    <NumberText
                      value={summary.issuedTicketCount}
                      formatNumber={formatNumber}
                    />
                  ) : (
                    <>
                      <NumberText
                        value={summary.issuedTicketCount}
                        formatNumber={formatNumber}
                      />{" "}
                      {t("gameSummary.text.issuedTickets")}
                    </>
                  )}
                </StatLine>
                <StatLine label={t("gameSummary.stat.totalVotes")}>
                  {locale === "en" ? (
                    <NumberText
                      value={summary.totalVotes}
                      formatNumber={formatNumber}
                    />
                  ) : (
                    <>
                      <NumberText
                        value={summary.totalVotes}
                        formatNumber={formatNumber}
                      />{" "}
                      {t("gameSummary.text.totalVotes")}
                    </>
                  )}
                </StatLine>
              </div>

              <div className="space-y-1 text-left">
                <StatLine
                  label={
                    locale === "ko"
                      ? t("gameSummary.text.canvasCompletion")
                      : t("gameSummary.stat.completion")
                  }
                >
                  <PercentText
                    value={summary.canvasCompletionPercent}
                    formatPercent={formatPercent}
                  />
                </StatLine>
                <StatLine label={t("gameSummary.stat.paintedCells")}>
                  {locale === "en" ? (
                    <>
                      <NumberText
                        value={summary.paintedCellCount}
                        formatNumber={formatNumber}
                      />{" "}
                      /{" "}
                      <NumberText
                        value={summary.totalCellCount}
                        formatNumber={formatNumber}
                      />
                    </>
                  ) : (
                    <>
                      총{" "}
                      <NumberText
                        value={summary.totalCellCount}
                        formatNumber={formatNumber}
                      />
                      칸 중{" "}
                      <NumberText
                        value={summary.paintedCellCount}
                        formatNumber={formatNumber}
                      />
                      칸 색칠되었어요
                    </>
                  )}
                </StatLine>
                <StatLine label={t("gameSummary.stat.emptyCells")}>
                  {locale === "en" ? (
                    <>
                      <NumberText
                        value={summary.emptyCellCount}
                        formatNumber={formatNumber}
                      />{" "}
                      remaining
                    </>
                  ) : (
                    <>
                      <NumberText
                        value={summary.emptyCellCount}
                        formatNumber={formatNumber}
                      />
                      칸이 남아 있어요
                    </>
                  )}
                </StatLine>
              </div>

              <div className="space-y-1 text-left">
                <StatLine label={t("gameSummary.stat.mostVotedCell")}>
                  {typeof summary.mostVotedCellX === "number" &&
                  typeof summary.mostVotedCellY === "number" ? (
                    locale === "en" ? (
                      <>
                        <CellCoordinate
                          summary={summary}
                          formatNumber={formatNumber}
                        />{" "}
                        {summary.mostVotedCellVoteCount > 0 ? (
                          <>
                            -{" "}
                            <NumberText
                              value={summary.mostVotedCellVoteCount}
                              formatNumber={formatNumber}
                            />
                            {getVoteUnit(
                              summary.mostVotedCellVoteCount,
                              locale,
                            )}
                          </>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <CellCoordinate
                          summary={summary}
                          formatNumber={formatNumber}
                        />
                        {summary.mostVotedCellVoteCount > 0 ? (
                          <>
                            ,{" "}
                            <NumberText
                              value={summary.mostVotedCellVoteCount}
                              formatNumber={formatNumber}
                            />
                            {t("gameSummary.text.votesSuffix")}
                          </>
                        ) : null}
                      </>
                    )
                  ) : (
                    "-"
                  )}
                </StatLine>
                <StatLine label={t("gameSummary.stat.randomResolved")}>
                  {locale === "en" ? (
                    <NumberText
                      value={summary.randomResolvedCellCount}
                      formatNumber={formatNumber}
                    />
                  ) : (
                    <>
                      {t("gameSummary.text.randomResolvedPrefix")}{" "}
                      <NumberText
                        value={summary.randomResolvedCellCount}
                        formatNumber={formatNumber}
                      />
                      {t("gameSummary.text.randomResolvedSuffix")}
                    </>
                  )}
                </StatLine>
              </div>

              <div className="space-y-1 text-left">
                <StatLine label={t("gameSummary.stat.usedColors")}>
                  {locale === "en" ? (
                    <NumberText
                      value={summary.usedColorCount}
                      formatNumber={formatNumber}
                    />
                  ) : (
                    <>
                      <NumberText
                        value={summary.usedColorCount}
                        formatNumber={formatNumber}
                      />{" "}
                      {t("gameSummary.text.usedColors")}
                    </>
                  )}
                </StatLine>
                <StatLine label={t("gameSummary.stat.mostSelectedColor")}>
                  <ColorStat
                    color={summary.mostSelectedColor}
                    count={summary.mostSelectedColorVoteCount}
                    formatNumber={formatNumber}
                    wrapCount={locale === "en"}
                    suffix={getVoteUnit(
                      summary.mostSelectedColorVoteCount,
                      locale,
                    )}
                  />
                </StatLine>
                <StatLine label={t("gameSummary.stat.mostPaintedColor")}>
                  <ColorStat
                    color={summary.mostPaintedColor}
                    count={summary.mostPaintedColorCellCount}
                    formatNumber={formatNumber}
                    wrapCount={locale === "en"}
                    suffix={getCellUnit(
                      summary.mostPaintedColorCellCount,
                      locale,
                    )}
                  />
                </StatLine>
              </div>

              <div className="space-y-1 text-left">
                <StatLine label={t("gameSummary.stat.hottestRound")}>
                  {summary.hottestRoundNumber ? (
                    locale === "en" ? (
                      <>
                        {t("round.round")}{" "}
                        <NumberText
                          value={summary.hottestRoundNumber}
                          formatNumber={formatNumber}
                        />{" "}
                        (
                        <NumberText
                          value={summary.hottestRoundVoteCount}
                          formatNumber={formatNumber}
                        />
                        {getVoteUnit(summary.hottestRoundVoteCount, locale)})
                      </>
                    ) : (
                      <>
                        <NumberText
                          value={summary.hottestRoundNumber}
                          formatNumber={formatNumber}
                        />
                        {t("gameSummary.text.roundSuffix")},{" "}
                        <NumberText
                          value={summary.hottestRoundVoteCount}
                          formatNumber={formatNumber}
                        />
                        {t("gameSummary.text.votesSuffix")}
                      </>
                    )
                  ) : (
                    "-"
                  )}
                </StatLine>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-[color:var(--page-theme-border-secondary)] bg-[color:var(--page-theme-surface-secondary)] px-5 py-4 text-sm leading-6 text-[color:var(--page-theme-text-secondary)]">
              <div>
                <p className="mb-1 font-bold text-[color:var(--page-theme-text-primary)]">
                  {t("gameSummary.stat.topVoters")}
                </p>
                <div>
                  <VoterList
                    voters={summary.topVoters}
                    listStyle={locale === "en" ? "list" : "inline"}
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 font-bold text-[color:var(--page-theme-text-primary)]">
                  {t("gameSummary.stat.allParticipants")}
                </p>
                <div>
                  <VoterList
                    voters={summary.participants}
                    limit={8}
                    listStyle={locale === "en" ? "list" : "inline"}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
