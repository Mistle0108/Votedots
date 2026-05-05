interface DownloadBlobFileParams {
  url: string;
  fileName: string;
}

export async function downloadBlobFile({
  url,
  fileName,
}: DownloadBlobFileParams) {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Download request failed with status ${response.status}`);
  }

  const blob = await response.blob();

  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 0);
}
