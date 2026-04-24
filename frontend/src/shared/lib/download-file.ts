import api from "@/shared/api/client";

interface DownloadBlobFileParams {
  url: string;
  fileName: string;
}

export async function downloadBlobFile({
  url,
  fileName,
}: DownloadBlobFileParams) {
  const response = await api.get<Blob>(url, {
    responseType: "blob",
  });

  const blobUrl = window.URL.createObjectURL(response.data);
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
