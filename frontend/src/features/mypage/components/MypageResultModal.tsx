import { useEffect } from "react";
import { useI18n } from "@/shared/i18n";
import { useSnapshotDownload } from "@/shared/hooks/useSnapshotDownload";
import { PixelSnapshotPreview } from "@/shared/ui/pixel-snapshot-preview";
import type { MypageParticipationDetailData } from "../model/mypage.types";

interface MypageResultModalProps {
  detail: MypageParticipationDetailData | null;
  open: boolean;
  onClose: () => void;
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

export default function MypageResultModal({
  detail,
  open,
  onClose,
}: MypageResultModalProps) {
  const { formatNumber, locale, t } = useI18n();
  const {
    canDownload: canDownloadDefaultSnapshot,
    isDownloading: isDownloadingDefaultSnapshot,
    downloadError: defaultDownloadError,
    download: downloadDefaultSnapshot,
    retry: retryDefaultSnapshot,
  } = useSnapshotDownload({
    snapshotUrl: detail?.downloadSnapshotUrl,
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
    snapshotUrl: detail?.highResolutionDownloadSnapshotUrl,
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
    : t("mypage.modal.emptyValue");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,25,20,0.52)] px-4 py-6">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <section className="relative z-10 flex max-h-[calc(100vh-48px)] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-[#e8d5c3] bg-[#fffaf5] shadow-[0_28px_90px_rgba(42,27,19,0.22)]">
        <header className="flex items-center justify-between border-b border-[#eadfce] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#cf6c45]">
              VoteDots
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#2d2d2d]">
              {t("mypage.modal.title")}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfce] bg-white text-xl text-[#7a685b] transition hover:bg-[#f4ebe2] hover:text-[#2d2d2d]"
            aria-label={t("mypage.modal.close")}
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="space-y-5">
              {detail.resultImageUrl ? (
                <PixelSnapshotPreview
                  snapshotUrl={detail.resultImageUrl}
                  alt={t("mypage.modal.snapshotAlt")}
                  backgroundAlt={t("mypage.modal.snapshotAlt")}
                  maxLongestSide={420}
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-[28px] border border-dashed border-[#ddc9b7] bg-[#f7efe7] px-6 text-center text-sm font-medium text-[#8a796c]">
                  {t("mypage.modal.noSnapshot")}
                </div>
              )}

              {(detail.downloadAvailable ||
                detail.highResolutionDownloadAvailable) && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {detail.downloadAvailable && (
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
                    )}

                    {detail.highResolutionDownloadAvailable && (
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
                    )}
                  </div>

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
              )}
            </div>

            <div className="rounded-[28px] border border-[#eadfce] bg-white px-5 py-4">
              <dl>
                <StatLine
                  label={t("mypage.modal.size")}
                  value={detail.size}
                />
                <StatLine
                  label={t("mypage.modal.endedAt")}
                  value={formatDateTime(detail.endedAt, locale)}
                />
                <StatLine
                  label={t("mypage.modal.totalRounds")}
                  value={formatNumber(detail.totalRounds)}
                />
                <StatLine
                  label={t("mypage.modal.participantCount")}
                  value={formatNumber(detail.participantCount)}
                />
                <StatLine
                  label={t("mypage.modal.totalVotes")}
                  value={formatNumber(detail.totalVotes)}
                />
                <StatLine
                  label={t("mypage.modal.topVoter")}
                  value={topVoterLabel}
                />
              </dl>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
