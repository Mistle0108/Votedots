import { useEffect, useState, type ReactNode } from "react";

interface CanvasResultCardProps {
  imageUrl: string | null;
  imageAlt: string;
  emptyMessage: string;
  footer: ReactNode;
  actionLabel: string;
  onAction: () => void;
}

export default function CanvasResultCard({
  imageUrl,
  imageAlt,
  emptyMessage,
  footer,
  actionLabel,
  onAction,
}: CanvasResultCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const showFallback = !imageUrl || imageFailed;

  return (
    <article className="overflow-hidden rounded-[28px] border border-[#ead7c8] bg-white shadow-[0_18px_50px_rgba(39,46,55,0.08)]">
      <div className="aspect-square overflow-hidden bg-white">
        {!showFallback ? (
          <img
            src={imageUrl}
            alt={imageAlt}
            className="h-full w-full object-contain"
            style={{ imageRendering: "pixelated" }}
            draggable={false}
            onError={() => {
              setImageFailed(true);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-[#8a796c]">
            {emptyMessage}
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-[#ead7c8] bg-[#fff8f1] px-5 py-5">
        {footer}

        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#d96d43] px-4 text-sm font-semibold text-white transition hover:bg-[#c95d34]"
        >
          {actionLabel}
        </button>
      </div>
    </article>
  );
}
