import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface CanvasResultCardProps {
  imageUrl: string | null;
  secondaryImageUrl?: string | null;
  imageAlt: string;
  emptyMessage: string;
  gridX?: number;
  gridY?: number;
  footer?: ReactNode;
  actionLabel: string;
  onAction: () => void;
}

const MAX_LONGEST_SIDE = 256;

export default function CanvasResultCard({
  imageUrl,
  secondaryImageUrl = null,
  imageAlt,
  emptyMessage,
  gridX,
  gridY,
  footer = null,
  actionLabel,
  onAction,
}: CanvasResultCardProps) {
  const [failedImageUrls, setFailedImageUrls] = useState<string[]>([]);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const [availableLongestSide, setAvailableLongestSide] =
    useState(MAX_LONGEST_SIDE);

  const activeImageUrl =
    imageUrl && !failedImageUrls.includes(imageUrl)
      ? imageUrl
      : secondaryImageUrl && !failedImageUrls.includes(secondaryImageUrl)
        ? secondaryImageUrl
        : null;
  const previewSize = useMemo(() => {
    if (!gridX || !gridY) {
      return null;
    }

    const longestSide = Math.min(MAX_LONGEST_SIDE, availableLongestSide);
    const scale = Math.max(1, Math.floor(longestSide / Math.max(gridX, gridY)));

    return {
      width: gridX * scale,
      height: gridY * scale,
    };
  }, [availableLongestSide, gridX, gridY]);

  const showFallback = !activeImageUrl;

  useEffect(() => {
    const element = previewFrameRef.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width;

      if (!nextWidth) {
        return;
      }

      const normalizedWidth = Math.max(1, Math.floor(nextWidth));

      setAvailableLongestSide((current) =>
        current === normalizedWidth ? current : normalizedWidth,
      );
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <article className="overflow-hidden rounded-[28px] border border-[#ead7c8] bg-white shadow-[0_18px_50px_rgba(39,46,55,0.08)]">
      <div
        ref={previewFrameRef}
        className="flex aspect-square items-center justify-center overflow-hidden bg-white"
      >
        {!showFallback ? (
          previewSize ? (
            <div
              className="flex-none overflow-hidden bg-white"
              style={{
                width: `${previewSize.width}px`,
                height: `${previewSize.height}px`,
                minWidth: `${previewSize.width}px`,
                minHeight: `${previewSize.height}px`,
                maxWidth: `${previewSize.width}px`,
                maxHeight: `${previewSize.height}px`,
              }}
            >
              <img
                src={activeImageUrl}
                alt={imageAlt}
                className="block h-full w-full"
                style={{ imageRendering: "pixelated" }}
                draggable={false}
                onError={() => {
                  setFailedImageUrls((current) =>
                    activeImageUrl && !current.includes(activeImageUrl)
                      ? [...current, activeImageUrl]
                      : current,
                  );
                }}
              />
            </div>
          ) : (
            <img
              src={activeImageUrl}
              alt={imageAlt}
              className="h-full w-full object-contain"
              style={{ imageRendering: "pixelated" }}
              draggable={false}
              onError={() => {
                setFailedImageUrls((current) =>
                  activeImageUrl && !current.includes(activeImageUrl)
                    ? [...current, activeImageUrl]
                    : current,
                );
              }}
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-[#8a796c]">
            {emptyMessage}
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-[#ead7c8] bg-[#fff8f1] px-4 py-4">
        {footer}

        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#d96d43] px-3 text-sm font-semibold text-white transition hover:bg-[#c95d34]"
        >
          {actionLabel}
        </button>
      </div>
    </article>
  );
}
