import { useEffect, useState } from "react";
import { useI18n } from "@/shared/i18n";
import { useSnapshotDownload } from "@/shared/hooks/useSnapshotDownload";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { PixelSnapshotPreview } from "@/shared/ui/pixel-snapshot-preview";
import type { CanvasResultDetailBase } from "../model/canvas-result.types";

const MOBILE_BREAKPOINT_MEDIA_QUERY = "(max-width: 767px)";

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
  showDownloadActions?: boolean;
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
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-start justify-between border-b border-[#eadfce] last:border-b-0",
        compact ? "gap-3 py-2.5" : "gap-4 py-3",
      ].join(" ")}
    >
      <dt
        className={[
          "font-semibold text-[#6c5a4d]",
          compact ? "text-[13px]" : "text-sm",
        ].join(" ")}
      >
        {label}
      </dt>
      <dd
        className={[
          "text-right font-medium text-[#2d2d2d]",
          compact ? "text-[13px]" : "text-sm",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

export default function CanvasResultModal({
  detail,
  open,
  onClose,
  labels,
  showDownloadActions = true,
}: CanvasResultModalProps) {
  const { formatNumber, locale, t } = useI18n();
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
      ? false
      : window.matchMedia(MOBILE_BREAKPOINT_MEDIA_QUERY).matches,
  );
  const currentPreviewUrl = detail?.resultImageUrl ?? null;
  const previewImageFailed =
    currentPreviewUrl !== null && failedPreviewUrl === currentPreviewUrl;
  const hasResultImage = Boolean(currentPreviewUrl) && !previewImageFailed;
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
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileLayout(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

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
        <header
          className={[
            "flex items-center justify-between border-b border-[#eadfce]",
            isMobileLayout ? "px-4 py-4" : "px-6 py-5",
          ].join(" ")}
        >
          <BrandLogo variant="wordmark" className="w-[112px]" />

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#eadfce] bg-white px-4 text-sm font-semibold text-[#7a685b] transition hover:bg-[#f4ebe2] hover:text-[#2d2d2d]"
            aria-label={labels.close}
          >
            {t("button.close")}
          </button>
        </header>

        <div
          className={[
            "min-h-0 flex-1 overflow-y-auto",
            isMobileLayout ? "px-4 py-4" : "px-6 py-6",
          ].join(" ")}
        >
          <div
            className={[
              "grid lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]",
              isMobileLayout ? "gap-4" : "gap-6",
            ].join(" ")}
          >
            <div className={isMobileLayout ? "space-y-4" : "space-y-5"}>
              {detail.resultImageUrl ? (
                <PixelSnapshotPreview
                  snapshotUrl={detail.resultImageUrl}
                  alt={labels.snapshotAlt}
                  backgroundAlt={labels.snapshotAlt}
                  maxLongestSide={isMobileLayout ? 256 : 420}
                  fallbackMessage={labels.noSnapshot}
                  onImageLoadStateChange={(state) => {
                    if (!currentPreviewUrl) {
                      return;
                    }

                    setFailedPreviewUrl(
                      state === "error" ? currentPreviewUrl : null,
                    );
                  }}
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-[28px] border border-dashed border-[#ddc9b7] bg-[#f7efe7] px-6 text-center text-sm font-medium text-[#8a796c]">
                  {labels.noSnapshot}
                </div>
              )}

              {showDownloadActions ? (
                <div className={isMobileLayout ? "space-y-2.5" : "space-y-3"}>
                  <div className="flex flex-row gap-2">
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
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-[#d8c8bb] bg-white px-4 text-sm font-semibold text-[#2d2d2d] transition hover:border-[#d96d43] hover:bg-[#fbf3eb] disabled:cursor-not-allowed disabled:border-[#e1d4c8] disabled:bg-[#ece2d9] disabled:text-[#9a8778]"
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
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[#d96d43] px-4 text-sm font-semibold text-white transition hover:bg-[#c95d34] disabled:cursor-not-allowed disabled:bg-[#d9cec3] disabled:text-[#8a796c]"
                    >
                      {isDownloadingHighResolutionSnapshot
                        ? t("gameSummary.downloadingHd")
                        : highResolutionDownloadError
                          ? t("gameSummary.downloadHdRetry")
                          : t("gameSummary.downloadHd")}
                    </button>
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
              ) : null}
            </div>

            <div
              className={[
                "rounded-[28px] border border-[#eadfce] bg-white",
                isMobileLayout ? "px-4 py-3.5" : "px-5 py-4",
              ].join(" ")}
            >
              <dl>
                <StatLine
                  label={labels.size}
                  value={detail.size}
                  compact={isMobileLayout}
                />
                <StatLine
                  label={labels.endedAt}
                  value={formatDateTime(detail.endedAt, locale)}
                  compact={isMobileLayout}
                />
                <StatLine
                  label={labels.totalRounds}
                  value={formatNumber(detail.totalRounds)}
                  compact={isMobileLayout}
                />
                <StatLine
                  label={labels.participantCount}
                  value={formatNumber(detail.participantCount)}
                  compact={isMobileLayout}
                />
                <StatLine
                  label={labels.totalVotes}
                  value={formatNumber(detail.totalVotes)}
                  compact={isMobileLayout}
                />
                <StatLine
                  label={labels.topVoter}
                  value={topVoterLabel}
                  compact={isMobileLayout}
                />
              </dl>

              {participants.length > 0 ? (
                <div
                  className={[
                    "border-t border-[#eadfce]",
                    isMobileLayout ? "mt-2.5 pt-2.5" : "mt-3 pt-3",
                  ].join(" ")}
                >
                  <p
                    className={[
                      "font-semibold text-[#6c5a4d]",
                      isMobileLayout ? "text-[13px]" : "text-sm",
                    ].join(" ")}
                  >
                    {labels.participantList}
                  </p>
                  <div className={isMobileLayout ? "mt-2.5 flex flex-wrap gap-1.5" : "mt-3 flex flex-wrap gap-2"}>
                    {participants.map((participant, index) => (
                      <span
                        key={`${participant}-${index}`}
                        className={[
                          "inline-flex items-center rounded-full border border-[#e3d3c4] bg-[#fff8f1] font-medium text-[#2d2d2d]",
                          isMobileLayout
                            ? "px-2.5 py-1 text-[13px]"
                            : "px-3 py-1.5 text-sm",
                        ].join(" ")}
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
