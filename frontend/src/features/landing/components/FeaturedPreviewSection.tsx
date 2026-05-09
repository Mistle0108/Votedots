import type { PublicSiteLocale } from "@/shared/hooks/use-public-site-locale";
import type { LandingFeaturedPreviewItem } from "../model/landing.types";
import FeaturedPreviewCard, {
  type FeaturedPreviewCardLabels,
} from "./FeaturedPreviewCard";

const FEATURED_PREVIEW_SLOTS = [
  { gridX: 32, gridY: 32, size: "32x32" },
  { gridX: 64, gridY: 64, size: "64x64" },
  { gridX: 128, gridY: 128, size: "128x128" },
  { gridX: 256, gridY: 256, size: "256x256" },
] as const;

interface FeaturedPreviewSectionProps {
  locale: PublicSiteLocale;
  items: LandingFeaturedPreviewItem[];
  labels: FeaturedPreviewCardLabels & {
    title: string;
    description: string;
  };
}

export default function FeaturedPreviewSection({
  locale,
  items,
  labels,
}: FeaturedPreviewSectionProps) {
  const previewBySize = new Map(items.map((item) => [item.preview.size, item]));

  return (
    <section className="mx-auto mt-10 max-w-7xl">
      <div className="text-left">
        <h2
          className="text-3xl font-semibold sm:text-4xl"
          style={{ color: "#000000" }}
        >
          {labels.title}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#5f6368]">
          {labels.description}
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {FEATURED_PREVIEW_SLOTS.map((slot) => (
          <FeaturedPreviewCard
            key={slot.size}
            locale={locale}
            gridX={slot.gridX}
            gridY={slot.gridY}
            item={previewBySize.get(slot.size) ?? null}
            labels={labels}
          />
        ))}
      </div>
    </section>
  );
}
