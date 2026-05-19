import type { PublicSiteLocale } from "@/shared/hooks/use-public-site-locale";
import type {
  LandingFeaturedPreviewItem,
} from "../model/landing.types";
import FeaturedPreviewImage from "./FeaturedPreviewImage";

export interface FeaturedPreviewCardLabels {
  participants: string;
  votes: string;
  topVoter: string;
}

interface FeaturedPreviewCardProps {
  locale: PublicSiteLocale;
  gridX: number;
  gridY: number;
  item: LandingFeaturedPreviewItem | null;
  labels: FeaturedPreviewCardLabels;
}

export default function FeaturedPreviewCard({
  locale,
  gridX,
  gridY,
  item,
  labels,
}: FeaturedPreviewCardProps) {
  const formatNumber = new Intl.NumberFormat(
    locale === "ko" ? "ko-KR" : "en-US",
  );
  const preview = item?.preview ?? null;

  return (
    <article className="mx-auto w-[332px] overflow-hidden rounded-[30px] bg-white shadow-[0_24px_70px_rgba(39,46,55,0.08)]">
      <div className="px-5 pb-4 pt-4">
        <div className="flex items-center justify-center gap-3">
          <h2
            className="w-full text-center text-xl font-semibold"
            style={{ color: "#000000" }}
          >
            {gridX} x {gridY}
          </h2>
        </div>

        <div className="mt-2 overflow-hidden rounded-[24px] bg-[#f6ede5] p-3">
          <FeaturedPreviewImage
            locale={locale}
            webpUrl={item?.webpUrl ?? null}
            alt={`${gridX} x ${gridY}`}
            gridX={gridX}
            gridY={gridY}
          />
        </div>

        <div className="mt-2 space-y-2 rounded-[24px] bg-[#fffaf4] px-3 py-3 text-left">
          <div className="rounded-2xl bg-[#f6ede5] px-3 py-2 shadow-[0_10px_24px_rgba(39,46,55,0.05)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#ead7c8] py-2 first:pt-0 last:border-b-0 last:pb-0">
              <p className="text-sm font-semibold text-[#7b6b62]">
                {labels.participants}
              </p>
              <p className="text-base font-semibold text-[#272E37]">
                {preview ? formatNumber.format(preview.participantCount) : "-"}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-[#ead7c8] py-2 first:pt-0 last:border-b-0 last:pb-0">
              <p className="text-sm font-semibold text-[#7b6b62]">
                {labels.votes}
              </p>
              <p className="text-base font-semibold text-[#272E37]">
                {preview ? formatNumber.format(preview.totalVotes) : "-"}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-[#7b6b62]">
                {labels.topVoter}
              </p>
              <p className="text-right text-base font-semibold text-[#272E37]">
                {preview?.topVoter.name
                  ? `${preview.topVoter.name} (${formatNumber.format(
                      preview.topVoter.voteCount,
                    )})`
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
