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
  playBackgroundImageUrl?: string | null;
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

export default function GameSummaryModal({
  summary,
  snapshotUrl,
  playBackgroundImageUrl,
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
        className="pointer-events-auto flex max-h-[min(calc(100vh-80px),680px)] w-[720px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] shadow-2xl"
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
              <div className="mx-auto w-1/2 min-w-[180px] rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] p-3 shadow-sm">
                <div className="relative overflow-hidden rounded border border-[color:var(--page-theme-border-secondary)] bg-[color:var(--page-theme-surface-secondary)]">
                  {playBackgroundImageUrl && (
                    <img
                      src={playBackgroundImageUrl}
                      alt="Game summary play background"
                      className="absolute inset-0 block h-full w-full"
                      style={{ imageRendering: "pixelated" }}
                      draggable={false}
                      onDragStart={(event) => {
                        event.preventDefault();
                      }}
                    />
                  )}
                  <img
                    src={finalSnapshotUrl}
                    alt={t("gameSummary.snapshotAlt")}
                    className="relative block w-full bg-transparent"
                    style={{ imageRendering: "pixelated" }}
                    draggable={false}
                    onDragStart={(event) => {
                      event.preventDefault();
                    }}
                  />
                </div>
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

            <section className="space-y-4 pl-38 text-[15px] leading-7 text-[color:var(--page-theme-text-secondary)]">
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
                <StatLine label={t("gameSummary.stat.ticketUsage")}>
                  <PercentText
                    value={summary.ticketUsageRate}
                    formatPercent={formatPercent}
                  />
                </StatLine>
              </div>
            </section>

            <section className="mx-auto w-4/6 space-y-3 rounded-2xl border border-[color:var(--page-theme-border-secondary)] bg-[color:var(--page-theme-surface-secondary)] px-5 py-4 text-sm leading-6 text-[color:var(--page-theme-text-secondary)]">
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
