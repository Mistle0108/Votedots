import { useMemo, useState } from "react";
import type { PublicSiteLocale } from "@/shared/hooks/use-public-site-locale";

interface FeaturedPreviewImageProps {
  locale: PublicSiteLocale;
  webpUrl: string | null;
  alt: string;
}

function getFallbackImageUrl(locale: PublicSiteLocale) {
  return locale === "ko"
    ? "/landing/fallback/ko/featured-preview-fallback.png"
    : "/landing/fallback/en/featured-preview-fallback.png";
}

export default function FeaturedPreviewImage({
  locale,
  webpUrl,
  alt,
}: FeaturedPreviewImageProps) {
  const fallbackImageUrl = useMemo(() => getFallbackImageUrl(locale), [locale]);
  const [failedWebpUrl, setFailedWebpUrl] = useState<string | null>(null);
  const imageUrl =
    !webpUrl || failedWebpUrl === webpUrl ? fallbackImageUrl : webpUrl;

  return (
    <div className="mx-auto flex w-fit justify-center">
      <div
        className="flex-none overflow-hidden rounded-[24px] bg-white shadow-[0_24px_60px_rgba(39,46,55,0.10)]"
        style={{
          width: "256px",
          height: "256px",
          minWidth: "256px",
          minHeight: "256px",
          maxWidth: "256px",
          maxHeight: "256px",
        }}
      >
        <img
          src={imageUrl}
          alt={alt}
          className="block h-full w-full"
          style={{ imageRendering: "pixelated" }}
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
