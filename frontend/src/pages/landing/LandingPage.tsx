import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/features/auth";
import { landingApi } from "@/features/landing/api/landing.api";
import FeaturedPreviewSection from "@/features/landing/components/FeaturedPreviewSection";
import type {
  LandingFeaturedPreviewItem,
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

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f6ede5] px-4 py-3 shadow-[0_10px_24px_rgba(39,46,55,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b6b62]">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-[#272E37]">{value}</p>
    </div>
  );
}


export default function LandingPage({ locale }: LandingPageProps) {
  const siteContent = useMemo(() => getSiteContent(locale), [locale]);
  const formatNumber = useMemo(
    () => new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US"),
    [locale],
  );

  const [authState, setAuthState] = useState<AuthState>("unknown");
  const [landingData, setLandingData] = useState<LandingPayload | null>(null);
  const [featuredPreviewItems, setFeaturedPreviewItems] = useState<
    LandingFeaturedPreviewItem[]
  >([]);
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
        const [landingResult, previewResult] = await Promise.allSettled([
          landingApi.getLandingPayload(),
          landingApi.getLandingPreviews(),
        ]);

        if (cancelled) {
          return;
        }

        if (landingResult.status === "fulfilled") {
          setLandingData(landingResult.value.data);
          setLandingError("");
        } else {
          setLandingError(siteContent.currentGame.loadError);
        }

        if (previewResult.status === "fulfilled") {
          setFeaturedPreviewItems(previewResult.value.data.items);
        } else {
          setFeaturedPreviewItems([]);
        }
      } catch {
        if (!cancelled) {
          setLandingError(siteContent.currentGame.loadError);
          setFeaturedPreviewItems([]);
        }
      }
    };

    void loadLanding();

    return () => {
      cancelled = true;
    };
  }, [siteContent.currentGame.loadError]);

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
    <div className="min-h-screen bg-[#fefbf7] text-[#272E37]">
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
        <section className="mx-auto max-w-7xl rounded-[42px] bg-[#ff8870] px-6 py-7 text-white shadow-[0_40px_120px_rgba(39,46,55,0.24)] sm:px-8 sm:py-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_584px] xl:items-stretch">
            <div className="flex flex-col items-center justify-center text-left xl:items-start">
              <div>
                <h1
                  className="max-w-3xl whitespace-pre-line text-4xl font-semibold leading-tight sm:text-5xl"
                  style={{ color: "#000000" }}
                >
                  {siteContent.hero.title}
                </h1>
                <p
                  className="mt-5 max-w-2xl whitespace-pre-line text-base leading-7 sm:text-lg"
                  style={{ color: "rgba(0, 0, 0, 0.82)" }}
                >
                  {siteContent.hero.description}
                </p>
              </div>

              <div className="mt-8 flex w-full justify-end">
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
                    imageUrl={
                      currentGame.snapshotUrl ?? currentGame.fallbackImageUrl
                    }
                    alt={
                      currentGame.snapshotUrl
                        ? siteContent.currentGame.snapshotLabel
                        : siteContent.currentGame.fallbackPreviewAlt
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
                    {siteContent.currentGame.emptyTitle}
                  </h2>
                  <p className="mt-4 whitespace-pre-line text-base leading-7 text-[#5f6368]">
                    {siteContent.currentGame.emptyDescription}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <FeaturedPreviewSection
          locale={locale}
          items={featuredPreviewItems}
          labels={{
            title: siteContent.featured.title,
            description: siteContent.featured.description,
            participants: siteContent.featured.stats.participants,
            votes: siteContent.featured.stats.votes,
            topVoter: siteContent.featured.stats.topVoter,
            participantList: siteContent.featured.stats.participantList,
          }}
        />

        <section className="mx-auto mt-10 max-w-7xl">
          <div className="text-left">
            <div className="text-[24px] font-semibold leading-[118%] text-[#272E37] lg:text-[24px]">
              {siteContent.tutorial.title}
            </div>
            <p className="mt-3 max-w-3xl whitespace-pre-line text-base leading-7 text-[#5f6368] sm:text-lg">
              {siteContent.tutorial.description}
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {siteContent.tutorial.cards.map((card) => (
                <article
                  key={card.id}
                  className="grid gap-5 overflow-hidden rounded-[34px] bg-white shadow-[0_24px_80px_rgba(39,46,55,0.06)] xl:grid-cols-[auto_minmax(0,1fr)]"
                //className="grid gap-5 rounded-[34px] bg-white shadow-[0_24px_80px_rgba(39,46,55,0.06)] xl:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]"
              >
                  <div className="bg-[linear-gradient(180deg,#fff4e9_0%,#f6ede5_100%)] p-5">
                    <div className="mx-auto h-[405px] w-fit overflow-hidden rounded-[24px] shadow-[0_24px_60px_rgba(39,46,55,0.10)]">
                    <div className="aspect-video h-full">
                      <img
                        src={card.imageUrl}
                        alt={card.imageAlt}
                        className="block h-full w-full object-contain"
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center px-6 py-6 text-left sm:px-8">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-semibold text-[#272E37]">
                      {card.title}
                    </h3>
                    {card.iconUrl ? (
                      <img
                        src={card.iconUrl}
                        alt=""
                        aria-hidden="true"
                        className="h-16 w-16 flex-none object-contain"
                        draggable={false}
                      />
                    ) : null}
                  </div>
                  <p className="mt-4 whitespace-pre-line text-base leading-7 text-[#5f6368]">
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
            <p className="max-w-2xl whitespace-pre-line text-sm leading-6 text-slate-300">
              {siteContent.footer.description}
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
