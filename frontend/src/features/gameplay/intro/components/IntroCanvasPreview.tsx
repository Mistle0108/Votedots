import { useMemo } from "react";

interface Props {
  backgroundImageUrl: string | null;
  gridX: number;
  gridY: number;
  maxSize?: number;
}

const DEFAULT_PREVIEW_SIZE = 260;

export default function IntroCanvasPreview({
  backgroundImageUrl,
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
        {backgroundImageUrl ? (
          <img
            src={backgroundImageUrl}
            alt="인트로 캔버스 배경"
            className="block rounded border border-gray-100 bg-white"
            style={{
              width: `${previewSize.width}px`,
              height: `${previewSize.height}px`,
              imageRendering: "pixelated",
            }}
            draggable={false}
          />
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
