import { useMemo, useState, type SyntheticEvent } from "react";

interface PixelSnapshotPreviewProps {
  snapshotUrl: string;
  alt: string;
  backgroundImageUrl?: string | null;
  backgroundAlt: string;
  maxLongestSide?: number;
  fallbackMessage?: string;
  onImageLoadStateChange?: (state: "ready" | "error") => void;
}

interface PreviewDimensions {
  width: number;
  height: number;
}

const DEFAULT_MAX_LONGEST_SIDE = 256;

function getPreviewDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxLongestSide: number,
): PreviewDimensions | null {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return null;
  }

  const longestSide = Math.max(naturalWidth, naturalHeight);
  const scale = Math.max(1, Math.floor(maxLongestSide / longestSide));

  return {
    width: naturalWidth * scale,
    height: naturalHeight * scale,
  };
}

export function PixelSnapshotPreview({
  snapshotUrl,
  alt,
  backgroundImageUrl = null,
  backgroundAlt,
  maxLongestSide = DEFAULT_MAX_LONGEST_SIDE,
  fallbackMessage,
  onImageLoadStateChange,
}: PixelSnapshotPreviewProps) {
  const [naturalDimensions, setNaturalDimensions] =
    useState<PreviewDimensions | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const previewDimensions = useMemo(() => {
    if (!naturalDimensions) {
      return null;
    }

    return getPreviewDimensions(
      naturalDimensions.width,
      naturalDimensions.height,
      maxLongestSide,
    );
  }, [maxLongestSide, naturalDimensions]);

  const previewStyle = previewDimensions
    ? {
        width: `${previewDimensions.width}px`,
        height: `${previewDimensions.height}px`,
      }
    : undefined;
  const fallbackPreviewStyle = {
    width: `${maxLongestSide}px`,
    height: `${maxLongestSide}px`,
    maxWidth: "100%",
  } as const;

  const handleSnapshotLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;

    setImageLoadFailed(false);
    setNaturalDimensions({
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
    onImageLoadStateChange?.("ready");
  };

  return (
    <div className="mx-auto w-fit max-w-full rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] p-3 shadow-sm">
      <div className="max-w-full overflow-auto">
        <div
          className="relative overflow-hidden rounded border border-[color:var(--page-theme-border-secondary)] bg-[color:var(--page-theme-surface-secondary)]"
          style={imageLoadFailed ? fallbackPreviewStyle : previewStyle}
        >
          {backgroundImageUrl && !imageLoadFailed && (
            <img
              src={backgroundImageUrl}
              alt={backgroundAlt}
              className="absolute inset-0 block h-full w-full"
              style={{ imageRendering: "pixelated" }}
              draggable={false}
              onDragStart={(event) => {
                event.preventDefault();
              }}
            />
          )}
          {imageLoadFailed ? (
            <div className="flex h-full min-h-[220px] w-full items-center justify-center px-6 text-center text-sm font-medium text-[#8a796c]">
              {fallbackMessage ?? alt}
            </div>
          ) : (
            <img
              src={snapshotUrl}
              alt={alt}
              className={[
                "relative block bg-transparent",
                previewDimensions ? "h-full w-full" : "max-w-full",
              ].join(" ")}
              style={{ imageRendering: "pixelated" }}
              draggable={false}
              onDragStart={(event) => {
                event.preventDefault();
              }}
              onLoad={handleSnapshotLoad}
              onError={() => {
                setImageLoadFailed(true);
                onImageLoadStateChange?.("error");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
