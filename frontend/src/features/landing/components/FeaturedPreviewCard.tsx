import type { PublicSiteLocale } from "@/shared/hooks/use-public-site-locale";
import type {
  LandingFeaturedGameCard,
  LandingParticipant,
} from "../model/landing.types";

export interface FeaturedPreviewCardLabels {
  emptyTitle: string;
  emptyDescription: string;
  participants: string;
  votes: string;
  topVoter: string;
  participantList: string;
  noTopVoter: string;
}

interface FeaturedPreviewCardProps {
  locale: PublicSiteLocale;
  card: LandingFeaturedGameCard;
  labels: FeaturedPreviewCardLabels;
}

function SnapshotImage({
  imageUrl,
  alt,
}: {
  imageUrl: string | null;
  alt: string;
}) {
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
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt}
            className="block h-full w-full"
            style={{ imageRendering: "pixelated" }}
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/70 px-4 text-center text-sm text-slate-500">
            {alt}
          </div>
        )}
      </div>
    </div>
  );
}

function getParticipantNames(participants: LandingParticipant[] | null) {
  if (!participants || participants.length === 0) {
    return [];
  }

  return participants.map((participant) => participant.name);
}

export default function FeaturedPreviewCard({
  locale,
  card,
  labels,
}: FeaturedPreviewCardProps) {
  const formatNumber = new Intl.NumberFormat(
    locale === "ko" ? "ko-KR" : "en-US",
  );
  const imageUrl = card.game?.snapshotUrl ?? card.fallbackImageUrl;
  const participantNames = getParticipantNames(card.game?.participants ?? null);

  return (
    <article className="overflow-hidden rounded-[30px] bg-white shadow-[0_24px_70px_rgba(39,46,55,0.08)]">
      <div className="px-5 pb-5 pt-5">
        <div className="flex items-center justify-center gap-3">
          <h2
            className="w-full text-center text-xl font-semibold"
            style={{ color: "#000000" }}
          >
            {card.gridX} x {card.gridY}
          </h2>
        </div>

        <div className="mt-4 overflow-hidden rounded-[24px] bg-[#f6ede5] p-4">
          <SnapshotImage imageUrl={imageUrl} alt={labels.emptyTitle} />
        </div>

        {card.state === "empty" || !card.game ? (
          <div className="mt-4 rounded-[24px] bg-[#fffaf4] px-4 py-5 text-left">
            <p className="text-base font-semibold text-[#272E37]">
              {labels.emptyTitle}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5f6368]">
              {labels.emptyDescription}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4 rounded-[24px] bg-[#fffaf4] px-4 py-4 text-left">
            <div className="rounded-2xl bg-[#f6ede5] px-4 py-3 text-center shadow-[0_10px_24px_rgba(39,46,55,0.05)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b6b62]">
                {labels.participants}
              </p>
              <p className="mt-1 text-base font-semibold text-[#272E37]">
                {formatNumber.format(card.game.participantCount)}
              </p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b6b62]">
                {labels.votes}
              </p>
              <p className="mt-1 text-base font-semibold text-[#272E37]">
                {formatNumber.format(card.game.totalVotes)}
              </p>
            </div>

            <div className="space-y-3 text-center text-sm leading-6 text-[#51545a]">
              <div>
                <p className="font-semibold text-[#7b6b62]">{labels.topVoter}</p>
                <p className="mt-1 text-base font-semibold text-[#272E37]">
                  {card.game.topVoterName
                    ? `${card.game.topVoterName} (${formatNumber.format(
                        card.game.topVoterVoteCount,
                      )})`
                    : labels.noTopVoter}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#7b6b62]">
                  {labels.participantList}
                </p>
                <div className="mt-2 rounded-2xl bg-white px-3 py-3 shadow-[inset_0_0_0_1px_rgba(234,215,200,0.95)]">
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
        )}
      </div>
    </article>
  );
}
