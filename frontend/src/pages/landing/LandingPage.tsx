import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/features/auth";
import { landingApi } from "@/features/landing/api/landing.api";
import type {
  LandingFeaturedGameCard,
  LandingPayload,
} from "@/features/landing/model/landing.types";
import { getSiteContent } from "@/shared/content/site-content";
import {
  type PublicSiteLocale,
  usePublicSiteLocale,
} from "@/shared/hooks/use-public-site-locale";
import { useAdsenseScript } from "@/shared/hooks/use-adsense-script";
import { usePageRootClass } from "@/shared/hooks/use-page-root-class";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Button } from "@/shared/ui/button";
import { SiteHeader } from "@/shared/ui/site-header";

type AuthState = "authenticated" | "guest" | "unknown";

interface LandingPageProps {
  locale: PublicSiteLocale;
}

function buildPublicText(locale: PublicSiteLocale) {
  if (locale === "ko") {
    return {
      heroTitle: "모두의 한 표가 모여, 한 장의 픽셀 캔버스를 완성합니다.",
      heroDescription:
        "실시간으로 같은 보드를 바라보며 한 라운드씩 결과를 쌓아 가는 VoteDots의 현재 게임과 종료 게임들을 바로 확인해 보세요.",
      liveLoadError: "랜딩 데이터를 불러오지 못했습니다.",
      livePanelEmpty: "현재 진행 중인 게임이 없습니다.",
      livePreviewFallback: "기본 템플릿 미리보기",
      featuredTitle: "그리드 크기별 종료 게임",
      featuredDescription:
        "현재 로테이션에 포함된 보드 크기별로 가장 많은 참여자를 모은 종료 게임을 보여줍니다.",
      participants: "참여자",
      votes: "총 투표 수",
      topVoter: "최다 투표자",
      participantList: "참여자 목록",
      noTopVoter: "아직 집계된 최다 투표자가 없습니다.",
      tutorialTitle: "처음 들어와도 바로 이해되는 플레이 흐름",
      footerDescription:
        "서비스 규칙, 개인정보 처리 기준, 커뮤니티 안내, 문의 정책을 이곳에서 확인할 수 있습니다.",
    };
  }

  return {
    heroTitle: "Every vote adds a pixel, and every round reveals more of the canvas.",
    heroDescription:
      "See the live board, browse finished games by grid size, and jump into VoteDots when you are ready to shape the next round.",
    liveLoadError: "Failed to load landing data.",
    livePanelEmpty: "There is no live game right now.",
    livePreviewFallback: "Default template preview",
    featuredTitle: "Finished games by grid size",
    featuredDescription:
      "These are the finished boards with the highest participant counts for the active rotation sizes.",
    participants: "Participants",
    votes: "Total votes",
    topVoter: "Top voter",
    participantList: "Participant list",
    noTopVoter: "No top voter has been recorded yet.",
    tutorialTitle: "A quick way to understand the play loop",
    footerDescription:
      "Review the service rules, privacy handling, community notes, and contact policy in one place.",
  };
}

function SnapshotImage({
  imageUrl,
  alt,
  size,
}: {
  imageUrl: string | null;
  alt: string;
  size: 256 | 512;
}) {
  return (
    <div className="mx-auto flex w-fit justify-center">
      <div
        className="flex-none overflow-hidden rounded-[24px] bg-white shadow-[0_24px_60px_rgba(39,46,55,0.10)]"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          maxWidth: `${size}px`,
          maxHeight: `${size}px`,
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

function InfoStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f6ede5] px-4 py-3 shadow-[0_10px_24px_rgba(39,46,55,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b6b62]">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-[#272E37]">{value}</p>
    </div>
  );
}

function getParticipantNames(
  participants: Array<{ voterId: number; name: string }> | null,
) {
  if (!participants || participants.length === 0) {
    return [];
  }

  return participants.map((participant) => participant.name);
}

function FeaturedGameCard({
  locale,
  card,
}: {
  locale: PublicSiteLocale;
  card: LandingFeaturedGameCard;
}) {
  const copy = buildPublicText(locale);
  const siteContent = getSiteContent(locale);
  const formatNumber = new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US");
  const imageUrl = card.game?.snapshotUrl ?? card.fallbackImageUrl;
  const participantNames = getParticipantNames(card.game?.participants ?? null);

  return (
    <article className="overflow-hidden rounded-[30px] bg-white shadow-[0_24px_70px_rgba(39,46,55,0.08)]">
      <div className="px-5 pb-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#272E37]">
            {card.gridX} x {card.gridY}
          </h2>
        </div>

        <div className="mt-4 overflow-hidden rounded-[24px] bg-[#f6ede5] p-4">
          <SnapshotImage
            imageUrl={imageUrl}
            alt={siteContent.featured.emptyTitle}
            size={256}
          />
        </div>

        {card.state === "empty" || !card.game ? (
          <div className="mt-4 rounded-[24px] bg-[#fffaf4] px-4 py-5 text-left">
            <p className="text-base font-semibold text-[#272E37]">
              {siteContent.featured.emptyTitle}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5f6368]">
              {siteContent.featured.emptyDescription}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4 rounded-[24px] bg-[#fffaf4] px-4 py-4 text-left">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoStat
                label={copy.participants}
                value={formatNumber.format(card.game.participantCount)}
              />
              <InfoStat
                label={copy.votes}
                value={formatNumber.format(card.game.totalVotes)}
              />
            </div>

            <div className="space-y-3 text-sm leading-6 text-[#51545a]">
              <div>
                <p className="font-semibold text-[#7b6b62]">{copy.topVoter}</p>
                <p className="mt-1 text-base font-semibold text-[#272E37]">
                  {card.game.topVoterName
                    ? `${card.game.topVoterName} (${formatNumber.format(
                        card.game.topVoterVoteCount,
                      )})`
                    : copy.noTopVoter}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#7b6b62]">{copy.participantList}</p>
                <div className="mt-2 rounded-2xl bg-white px-3 py-3 shadow-[inset_0_0_0_1px_rgba(234,215,200,0.95)]">
                  {participantNames.length > 0 ? (
                    <div className="flex h-24 flex-wrap content-start gap-2 overflow-y-auto pr-1">
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
                    <p className="flex h-24 items-center text-sm text-[#7b6b62]">-</p>
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

export default function LandingPage({ locale }: LandingPageProps) {
  const siteContent = useMemo(() => getSiteContent(locale), [locale]);
  const copy = useMemo(() => buildPublicText(locale), [locale]);
  const formatNumber = useMemo(
    () => new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US"),
    [locale],
  );

  const [authState, setAuthState] = useState<AuthState>("unknown");
  const [landingData, setLandingData] = useState<LandingPayload | null>(null);
  const [landingError, setLandingError] = useState("");

  usePageRootClass("page-shell-root");
  usePublicSiteLocale(locale);
  useAdsenseScript();

  useEffect(() => {
    let cancelled = false;

    void authApi
      .me()
      .then(() => {
        if (!cancelled) {
          setAuthState("authenticated");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthState("guest");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLanding = async () => {
      try {
        const { data } = await landingApi.getLandingPayload();

        if (!cancelled) {
          setLandingData(data);
          setLandingError("");
        }
      } catch {
        if (!cancelled) {
          setLandingError(copy.liveLoadError);
        }
      }
    };

    void loadLanding();

    return () => {
      cancelled = true;
    };
  }, [copy.liveLoadError]);

  const handleParticipate = async () => {
    if (authState === "authenticated") {
      window.location.assign("/play");
      return;
    }

    if (authState === "guest") {
      window.location.assign("/login");
      return;
    }

    try {
      await authApi.me();
      window.location.assign("/play");
    } catch {
      window.location.assign("/login");
    }
  };

  const currentGame = landingData?.currentGame ?? null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(222,85,72,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(61,214,140,0.16),transparent_28%),radial-gradient(circle_at_76%_62%,rgba(70,154,229,0.12),transparent_28%),linear-gradient(180deg,#fbf3ec_0%,#fff8f2_44%,#f6f1ea_100%)] text-[#272E37]">
      <SiteHeader
        locale={locale}
        items={[
          {
            key: "patches",
            label: siteContent.nav.patchNotes,
            to: `/${locale}/patches`,
          },
          {
            key: "roadmap",
            label: siteContent.nav.roadmap,
            to: `/${locale}/roadmap`,
          },
        ]}
      />

      <main className="px-4 pb-20 pt-6 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-7xl rounded-[42px] bg-[#DE5548] px-6 py-7 text-white shadow-[0_40px_120px_rgba(39,46,55,0.24)] sm:px-8 sm:py-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_584px] xl:items-stretch">
            <div className="flex flex-col justify-between text-left">
              <div>
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  {copy.heroTitle}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/86 sm:text-lg">
                  {copy.heroDescription}
                </p>
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleParticipate}
                  className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-[#d14d28] hover:bg-white/90"
                >
                  {siteContent.hero.cta}
                </Button>
              </div>
            </div>

            <div className="rounded-[32px] bg-[#fff1ea]/14 p-4 sm:p-5 xl:w-[584px] xl:justify-self-end">
              {landingError ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-[28px] bg-[#f6ede5] px-6 text-center text-sm text-[#5f6368]">
                  {landingError}
                </div>
              ) : currentGame ? (
                <div className="space-y-4">
                  <h2 className="text-left text-2xl font-semibold text-white">
                    {siteContent.currentGame.title}
                  </h2>

                  <SnapshotImage
                    imageUrl={currentGame.snapshotUrl ?? currentGame.fallbackImageUrl}
                    alt={
                      currentGame.snapshotUrl
                        ? siteContent.currentGame.snapshotLabel
                        : copy.livePreviewFallback
                    }
                    size={512}
                  />

                  <div className="grid gap-3 sm:grid-cols-3">
                    <InfoStat
                      label={siteContent.currentGame.stats.grid}
                      value={`${currentGame.gridX} x ${currentGame.gridY}`}
                    />
                    <InfoStat
                      label={siteContent.currentGame.stats.round}
                      value={`${formatNumber.format(
                        currentGame.currentRoundNumber,
                      )} / ${formatNumber.format(currentGame.totalRounds)}`}
                    />
                    <InfoStat
                      label={siteContent.currentGame.stats.participants}
                      value={formatNumber.format(currentGame.participantCount)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[420px] flex-col items-start justify-center rounded-[28px] bg-[#f6ede5] px-6 text-left">
                  <h2 className="text-2xl font-semibold text-[#272E37]">
                    {siteContent.currentGame.title}
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[#5f6368]">
                    {copy.livePanelEmpty}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl">
          <div className="text-left">
            <h2 className="text-3xl font-semibold text-[#272E37] sm:text-4xl">
              {copy.featuredTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#5f6368]">
              {copy.featuredDescription}
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {(landingData?.featuredGames ?? []).map((card) => (
              <FeaturedGameCard key={card.profileKey} locale={locale} card={card} />
            ))}
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl">
          <div className="text-left">
            <h2 className="text-3xl font-semibold text-[#272E37] sm:text-4xl">
              {copy.tutorialTitle}
            </h2>
          </div>

          <div className="mt-8 space-y-6">
            {siteContent.tutorial.cards.map((card) => (
              <article
                key={card.id}
                className="grid gap-5 rounded-[34px] bg-white shadow-[0_24px_80px_rgba(39,46,55,0.06)] xl:grid-cols-[552px_minmax(0,1fr)]"
              >
                <div className="bg-[linear-gradient(180deg,#fff4e9_0%,#f6ede5_100%)] p-5">
                  <SnapshotImage imageUrl={card.imageUrl} alt={card.imageAlt} size={512} />
                </div>

                <div className="flex flex-col justify-center px-6 py-6 text-left sm:px-8">
                  <h3 className="text-2xl font-semibold text-[#272E37]">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-[#5f6368]">
                    {card.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#20262f] bg-[#272E37] px-4 py-10 text-[#f6ede5] sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="inline-flex items-center gap-3">
              <BrandLogo variant="symbol" className="w-7" />
              <BrandLogo variant="wordmarkLight" className="w-20" />
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              {copy.footerDescription}
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
            <Link to={`/${locale}/terms`} className="hover:text-[#DE5548]">
              {siteContent.footer.links.terms}
            </Link>
            <Link to={`/${locale}/privacy`} className="hover:text-[#DE5548]">
              {siteContent.footer.links.privacy}
            </Link>
            <Link to={`/${locale}/community`} className="hover:text-[#DE5548]">
              {siteContent.footer.links.community}
            </Link>
            <Link to={`/${locale}/contact`} className="hover:text-[#DE5548]">
              {siteContent.footer.links.contact}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
