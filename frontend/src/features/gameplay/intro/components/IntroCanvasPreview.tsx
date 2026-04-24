import { useMemo } from "react";

interface Props {
  playBackgroundImageUrl: string | null;
  resultTemplateImageUrl: string | null;
  gridX: number;
  gridY: number;
  maxSize?: number;
}

const DEFAULT_PREVIEW_SIZE = 260;

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
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        {playBackgroundImageUrl || resultTemplateImageUrl ? (
          <div
            className="relative overflow-hidden rounded border border-gray-100 bg-white"
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
            className="rounded border border-gray-100 bg-gray-100"
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
