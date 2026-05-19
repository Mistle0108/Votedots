import { useEffect } from "react";
import { useI18n } from "@/shared/i18n";
import { useSnapshotDownload } from "@/shared/hooks/useSnapshotDownload";
import { PixelSnapshotPreview } from "@/shared/ui/pixel-snapshot-preview";
import type { CanvasResultDetailBase } from "../model/canvas-result.types";

interface CanvasResultModalLabels {
  title: string;
  close: string;
  snapshotAlt: string;
  noSnapshot: string;
  size: string;
  endedAt: string;
  totalRounds: string;
  participantCount: string;
  totalVotes: string;
  topVoter: string;
  emptyValue: string;
  participantList: string;
}

interface CanvasResultModalProps {
  detail: CanvasResultDetailBase | null;
  open: boolean;
  onClose: () => void;
  labels: CanvasResultModalLabels;
}

function formatDateTime(value: string, locale: "ko" | "en") {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#eadfce] py-3 last:border-b-0">
      <dt className="text-sm font-semibold text-[#6c5a4d]">{label}</dt>
      <dd className="text-right text-sm font-medium text-[#2d2d2d]">{value}</dd>
    </div>
  );
}

export default function CanvasResultModal({
  detail,
  open,
  onClose,
  labels,
}: CanvasResultModalProps) {
  const { formatNumber, locale, t } = useI18n();
  const hasResultImage = Boolean(detail?.resultImageUrl);
  const canDownloadDefault = Boolean(
    hasResultImage && detail?.downloadAvailable && detail?.downloadSnapshotUrl,
  );
  const canDownloadHighResolution = Boolean(
    hasResultImage &&
      detail?.highResolutionDownloadAvailable &&
      detail?.highResolutionDownloadSnapshotUrl,
  );

  const {
    canDownload: canDownloadDefaultSnapshot,
    isDownloading: isDownloadingDefaultSnapshot,
    downloadError: defaultDownloadError,
    download: downloadDefaultSnapshot,
    retry: retryDefaultSnapshot,
  } = useSnapshotDownload({
    snapshotUrl: canDownloadDefault ? detail?.downloadSnapshotUrl ?? null : null,
    canvasId: detail?.canvasId,
    endedAt: detail?.endedAt,
    createdAt: detail?.createdAt,
    updatedAt: detail?.updatedAt,
  });
  const {
    canDownload: canDownloadHighResolutionSnapshot,
    isDownloading: isDownloadingHighResolutionSnapshot,
    downloadError: highResolutionDownloadError,
    download: downloadHighResolutionSnapshot,
    retry: retryHighResolutionSnapshot,
  } = useSnapshotDownload({
    snapshotUrl: canDownloadHighResolution
      ? detail?.highResolutionDownloadSnapshotUrl ?? null
      : null,
    canvasId: detail?.canvasId,
    endedAt: detail?.endedAt,
    createdAt: detail?.createdAt,
    updatedAt: detail?.updatedAt,
    fileNameSuffix: "-hd",
  });

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || !detail) {
    return null;
  }

  const topVoterLabel = detail.topVoterName
    ? `${detail.topVoterName} (${formatNumber(detail.topVoterVoteCount)})`
    : labels.emptyValue;
  const participants = detail.participants.filter(
    (participant) => participant.trim().length > 0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,25,20,0.52)] px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <section className="relative z-10 flex max-h-[calc(100vh-48px)] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-[#e8d5c3] bg-[#fffaf5] shadow-[0_28px_90px_rgba(42,27,19,0.22)]">
        <header className="flex items-center justify-between border-b border-[#eadfce] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#cf6c45]">
              VoteDots
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#2d2d2d]">
              {labels.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#eadfce] bg-white px-4 text-sm font-semibold text-[#7a685b] transition hover:bg-[#f4ebe2] hover:text-[#2d2d2d]"
            aria-label={labels.close}
          >
            {t("button.close")}
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="space-y-5">
              {detail.resultImageUrl ? (
                <PixelSnapshotPreview
                  snapshotUrl={detail.resultImageUrl}
                  alt={labels.snapshotAlt}
                  backgroundAlt={labels.snapshotAlt}
                  maxLongestSide={420}
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-[28px] border border-dashed border-[#ddc9b7] bg-[#f7efe7] px-6 text-center text-sm font-medium text-[#8a796c]">
                  {labels.noSnapshot}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={
                      defaultDownloadError
                        ? retryDefaultSnapshot
                        : downloadDefaultSnapshot
                    }
                    disabled={
                      isDownloadingDefaultSnapshot ||
                      !canDownloadDefaultSnapshot
                    }
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-[#d8c8bb] bg-white px-4 text-sm font-semibold text-[#2d2d2d] transition hover:border-[#d96d43] hover:bg-[#fbf3eb] disabled:cursor-not-allowed disabled:border-[#e5d9ce] disabled:bg-[#f1e5da] disabled:text-[#9a8778]"
                  >
                    {isDownloadingDefaultSnapshot
                      ? t("gameSummary.downloading")
                      : defaultDownloadError
                        ? t("gameSummary.downloadRetry")
                        : t("gameSummary.download")}
                  </button>

                  <button
                    type="button"
                    onClick={
                      highResolutionDownloadError
                        ? retryHighResolutionSnapshot
                        : downloadHighResolutionSnapshot
                    }
                    disabled={
                      isDownloadingHighResolutionSnapshot ||
                      !canDownloadHighResolutionSnapshot
                    }
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[#d96d43] px-4 text-sm font-semibold text-white transition hover:bg-[#c95d34] disabled:cursor-not-allowed disabled:bg-[#d8c6b7] disabled:text-[#8a796c]"
                  >
                    {isDownloadingHighResolutionSnapshot
                      ? t("gameSummary.downloadingHd")
                      : highResolutionDownloadError
                        ? t("gameSummary.downloadHdRetry")
                        : t("gameSummary.downloadHd")}
                  </button>
                </div>

                {!hasResultImage ? (
                  <p className="text-sm font-medium text-[#8a796c]">
                    {labels.noSnapshot}
                  </p>
                ) : null}

                {defaultDownloadError ? (
                  <p className="text-sm font-medium text-[#c04f2c]">
                    {defaultDownloadError}
                  </p>
                ) : null}

                {highResolutionDownloadError ? (
                  <p className="text-sm font-medium text-[#c04f2c]">
                    {highResolutionDownloadError}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-[#eadfce] bg-white px-5 py-4">
              <dl>
                <StatLine label={labels.size} value={detail.size} />
                <StatLine
                  label={labels.endedAt}
                  value={formatDateTime(detail.endedAt, locale)}
                />
                <StatLine
                  label={labels.totalRounds}
                  value={formatNumber(detail.totalRounds)}
                />
                <StatLine
                  label={labels.participantCount}
                  value={formatNumber(detail.participantCount)}
                />
                <StatLine
                  label={labels.totalVotes}
                  value={formatNumber(detail.totalVotes)}
                />
                <StatLine label={labels.topVoter} value={topVoterLabel} />
              </dl>

              {participants.length > 0 ? (
                <div className="mt-3 border-t border-[#eadfce] pt-3">
                  <p className="text-sm font-semibold text-[#6c5a4d]">
                    {labels.participantList}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {participants.map((participant, index) => (
                      <span
                        key={`${participant}-${index}`}
                        className="inline-flex items-center rounded-full border border-[#e3d3c4] bg-[#fff8f1] px-3 py-1.5 text-sm font-medium text-[#2d2d2d]"
                      >
                        {participant}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
