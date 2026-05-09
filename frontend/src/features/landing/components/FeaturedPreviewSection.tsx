import type { PublicSiteLocale } from "@/shared/hooks/use-public-site-locale";
import type { LandingFeaturedGameCard } from "../model/landing.types";
import FeaturedPreviewCard, {
  type FeaturedPreviewCardLabels,
} from "./FeaturedPreviewCard";

interface FeaturedPreviewSectionProps {
  locale: PublicSiteLocale;
  cards: LandingFeaturedGameCard[];
  labels: FeaturedPreviewCardLabels & {
    title: string;
    description: string;
  };
}

export default function FeaturedPreviewSection({
  locale,
  cards,
  labels,
}: FeaturedPreviewSectionProps) {
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
        {cards.map((card) => (
          <FeaturedPreviewCard
            key={card.profileKey}
            locale={locale}
            card={card}
            labels={labels}
          />
        ))}
      </div>
    </section>
  );
}
