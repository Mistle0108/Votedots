import { useMemo } from "react";

interface Props {
  playBackgroundImageUrl: string | null;
  resultTemplateImageUrl: string | null;
  gridX: number;
  gridY: number;
  maxSize?: number;
}

const DEFAULT_PREVIEW_SIZE = 512;

export default function IntroCanvasPreview({
  playBackgroundImageUrl,
  resultTemplateImageUrl,
  gridX,
  gridY,
  maxSize = DEFAULT_PREVIEW_SIZE,
}: Props) {
  const previewSize = useMemo(() => {
    const longestSide = Math.max(gridX, gridY, 1);
    const scale = maxSize / longestSide;

    return {
      width: Math.max(1, Math.round(gridX * scale)),
      height: Math.max(1, Math.round(gridY * scale)),
    };
  }, [gridX, gridY, maxSize]);

  return (
    <div className="w-fit">
      <div className="rounded-2xl border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] p-4 shadow-sm">
        {playBackgroundImageUrl || resultTemplateImageUrl ? (
          <div
            className="relative overflow-hidden rounded border border-[color:var(--page-theme-border-secondary)] bg-[color:var(--page-theme-surface-primary)]"
            style={{
              width: `${previewSize.width}px`,
              height: `${previewSize.height}px`,
            }}
          >
            {playBackgroundImageUrl && (
              <img
                src={playBackgroundImageUrl}
                alt="Intro play background"
                className="absolute inset-0 block h-full w-full"
                style={{ imageRendering: "pixelated" }}
                draggable={false}
                onDragStart={(event) => {
                  event.preventDefault();
                }}
              />
            )}
            {resultTemplateImageUrl && (
              <img
                src={resultTemplateImageUrl}
                alt="Intro result template"
                className="absolute inset-0 block h-full w-full"
                style={{ imageRendering: "pixelated" }}
                draggable={false}
                onDragStart={(event) => {
                  event.preventDefault();
                }}
              />
            )}
          </div>
        ) : (
          <div
            className="rounded border border-[color:var(--page-theme-border-secondary)] bg-[color:var(--page-theme-surface-secondary)]"
            style={{
              width: `${previewSize.width}px`,
              height: `${previewSize.height}px`,
            }}
          />
        )}
      </div>
    </div>
  );
}
