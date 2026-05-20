import type { PublicSiteLocale } from "@/shared/hooks/use-public-site-locale";
import type { LandingFeaturedPreviewItem } from "../model/landing.types";
import FeaturedPreviewImage from "./FeaturedPreviewImage";

interface FeaturedPreviewCardProps {
  locale: PublicSiteLocale;
  item: LandingFeaturedPreviewItem;
}

export default function FeaturedPreviewCard({
  locale,
  item,
}: FeaturedPreviewCardProps) {
  return (
    <FeaturedPreviewImage
      locale={locale}
      webpUrl={item.webpUrl}
      alt={`${item.preview.gridX} x ${item.preview.gridY}`}
      gridX={item.preview.gridX}
      gridY={item.preview.gridY}
    />
  );
}
