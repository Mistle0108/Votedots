import { useMemo, useState } from "react";
import type { PublicSiteLocale } from "@/shared/hooks/use-public-site-locale";

interface FeaturedPreviewImageProps {
  locale: PublicSiteLocale;
  webpUrl: string | null;
  alt: string;
  gridX: number;
  gridY: number;
}

const MAX_LONGEST_SIDE = 256;

function getFallbackImageUrl(locale: PublicSiteLocale) {
  return locale === "ko"
    ? "/landing/fallback/ko/featured-preview-fallback.png"
    : "/landing/fallback/en/featured-preview-fallback.png";
}

function getPixelPerfectPreviewSize(gridX: number, gridY: number) {
  const longestSide = Math.max(gridX, gridY);
  const scale = Math.max(1, Math.floor(MAX_LONGEST_SIDE / longestSide));

  return {
    width: gridX * scale,
    height: gridY * scale,
  };
}

export default function FeaturedPreviewImage({
  locale,
  webpUrl,
  alt,
  gridX,
  gridY,
}: FeaturedPreviewImageProps) {
  const fallbackImageUrl = useMemo(() => getFallbackImageUrl(locale), [locale]);
  const [failedWebpUrl, setFailedWebpUrl] = useState<string | null>(null);
  const imageUrl =
    !webpUrl || failedWebpUrl === webpUrl ? fallbackImageUrl : webpUrl;
  const isFallbackImage = imageUrl === fallbackImageUrl;
  const previewSize = useMemo(
    () => getPixelPerfectPreviewSize(gridX, gridY),
    [gridX, gridY],
  );

  return (
    <div className="mx-auto flex w-fit justify-center">
      <div
        className="flex-none overflow-hidden rounded-[24px] bg-white shadow-[0_24px_60px_rgba(39,46,55,0.10)]"
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
          src={imageUrl}
          alt={alt}
          className="block h-full w-full"
          style={{ imageRendering: isFallbackImage ? "auto" : "pixelated" }}
          draggable={false}
          onError={() => {
            if (webpUrl && imageUrl !== fallbackImageUrl) {
              setFailedWebpUrl(webpUrl);
            }
          }}
        />
      </div>
    </div>
  );
}
