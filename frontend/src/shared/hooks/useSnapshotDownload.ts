import { useCallback, useState } from "react";
import { useI18n } from "@/shared/i18n";
import { downloadBlobFile } from "@/shared/lib/download-file";
import {
  canDownloadSnapshot,
  getSnapshotDownloadFileName,
  type SnapshotDownloadMeta,
} from "@/shared/lib/snapshot-download";

type SnapshotDownloadStatus = "idle" | "loading" | "error";

export function useSnapshotDownload(meta: SnapshotDownloadMeta) {
  const { t } = useI18n();
  const [status, setStatus] = useState<SnapshotDownloadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canDownload = canDownloadSnapshot(meta);

  const download = useCallback(async () => {
    if (!canDownload || !meta.snapshotUrl) {
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const fileName = getSnapshotDownloadFileName(meta);

      await downloadBlobFile({
        url: meta.snapshotUrl,
        fileName,
      });

      setStatus("idle");
    } catch (error) {
      console.error("[snapshot-download] failed:", error);
      setStatus("error");
      setErrorMessage(t("gameSummary.downloadError"));
    }
  }, [canDownload, meta, t]);

  const resetError = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  return {
    canDownload,
    isDownloading: status === "loading",
    downloadError: errorMessage,
    download,
    retry: download,
    resetError,
  };
}
