import type { PublicSiteLocale } from "@/shared/hooks/use-public-site-locale";
import type {
  LandingFeaturedPreviewItem,
} from "../model/landing.types";
import FeaturedPreviewImage from "./FeaturedPreviewImage";

export interface FeaturedPreviewCardLabels {
  participants: string;
  votes: string;
  topVoter: string;
  participantList: string;
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
  const participantNames = preview?.participants ?? [];

  return (
    <article className="mx-auto w-[300px] overflow-hidden rounded-[30px] bg-white shadow-[0_24px_70px_rgba(39,46,55,0.08)]">
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

          <div className="space-y-1.5 text-center text-sm leading-6 text-[#51545a]">
            <div>
              <p className="font-semibold text-[#7b6b62]">
                {labels.participantList}
              </p>
              <div className="mt-1.5 rounded-2xl bg-white px-3 py-2 shadow-[inset_0_0_0_1px_rgba(234,215,200,0.95)]">
                {participantNames.length > 0 ? (
                  <div className="flex h-24 flex-wrap content-start justify-center gap-2 overflow-y-auto pr-1">
                    {participantNames.map((name, index) => (
                      <span
                        key={`${name}-${index}`}
                        className="inline-flex items-center rounded-full bg-[#f6ede5] px-3 py-1 text-xs font-medium text-[#51545a]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="flex h-24 items-center justify-center text-sm text-[#7b6b62]">
                    -
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
