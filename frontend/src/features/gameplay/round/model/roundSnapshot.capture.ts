interface CaptureRoundSnapshotParams {
  canvas: HTMLCanvasElement;
  type?: "image/png" | "image/jpeg" | "image/webp";
  quality?: number;
}

export function captureRoundSnapshot({
  canvas,
  type = "image/png",
  quality,
}: CaptureRoundSnapshotParams): string | null {
  try {
    return canvas.toDataURL(type, quality);
  } catch {
    return null;
  }
}
