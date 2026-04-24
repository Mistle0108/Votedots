import { useCallback, useState } from "react";
import { downloadBlobFile } from "@/shared/lib/download-file";
import {
  canDownloadSnapshot,
  getSnapshotDownloadFileName,
  type SnapshotDownloadMeta,
} from "@/shared/lib/snapshot-download";

type SnapshotDownloadStatus = "idle" | "loading" | "error";

export function useSnapshotDownload(meta: SnapshotDownloadMeta) {
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
      setErrorMessage("이미지 다운로드에 실패했습니다. 다시 시도해 주세요.");
    }
  }, [canDownload, meta]);

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
