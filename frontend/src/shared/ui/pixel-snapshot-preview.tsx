import { useMemo, useState, type SyntheticEvent } from "react";

interface PixelSnapshotPreviewProps {
  snapshotUrl: string;
  alt: string;
  backgroundImageUrl?: string | null;
  backgroundAlt: string;
  maxLongestSide?: number;
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
  const scale = maxLongestSide / longestSide;

  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale),
  };
}

export function PixelSnapshotPreview({
  snapshotUrl,
  alt,
  backgroundImageUrl = null,
  backgroundAlt,
  maxLongestSide = DEFAULT_MAX_LONGEST_SIDE,
}: PixelSnapshotPreviewProps) {
  const [naturalDimensions, setNaturalDimensions] =
    useState<PreviewDimensions | null>(null);

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

  const handleSnapshotLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;

    setNaturalDimensions({
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
  };

  return (
    <div className="mx-auto w-fit max-w-full rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] p-3 shadow-sm">
      <div className="max-w-full overflow-auto">
        <div
          className="relative overflow-hidden rounded border border-[color:var(--page-theme-border-secondary)] bg-[color:var(--page-theme-surface-secondary)]"
          style={previewStyle}
        >
          {backgroundImageUrl && (
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
          />
        </div>
      </div>
    </div>
  );
}
