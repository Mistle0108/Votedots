import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTrackVisitEvent } from "@/features/analytics/hooks/use-track-visit-event";
import { landingApi } from "@/features/landing/api/landing.api";
import FeaturedPreviewCard from "@/features/landing/components/FeaturedPreviewCard";
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
import { usePageRootClass } from "@/shared/hooks/use-page-root-class";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Button } from "@/shared/ui/button";
import { SiteHeader } from "@/shared/ui/site-header";

const LARGE_SNAPSHOT_SIZE = 512;
const SMALL_SNAPSHOT_SIZE = 256;
const MOBILE_BREAKPOINT_MEDIA_QUERY = "(max-width: 767px)";
const MOBILE_SWIPE_THRESHOLD_PX = 40;

type MobileLandingTab = "current" | "completed" | "guide";
type CarouselAnimationStage =
  | "idle"
  | "out-left"
  | "out-right"
  | "in-left"
  | "in-right";

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
    <div className="mx-auto flex w-full justify-center">
      <div
        className="aspect-square w-full overflow-hidden rounded-[24px] bg-white shadow-[0_24px_60px_rgba(39,46,55,0.10)]"
        style={{
          maxWidth: `${size}px`,
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

function InfoStatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <p className="text-[17px] font-semibold text-[#7b6b62]">{label}</p>
      <p className="text-[17px] font-semibold text-[#272E37]">{value}</p>
    </div>
  );
}

function MobilePaginationDots({
  count,
  activeIndex,
  onSelect,
}: {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  if (count <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }, (_, index) => {
        const active = index === activeIndex;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            className={[
              "h-2.5 w-2.5 rounded-full transition",
              active ? "bg-[#272E37]" : "bg-white/55",
            ].join(" ")}
            aria-label={`Go to page ${index + 1}`}
          />
        );
      })}
    </div>
  );
}

export default function LandingPage({ locale }: LandingPageProps) {
  const siteContent = useMemo(() => getSiteContent(locale), [locale]);
  const formatNumber = useMemo(
    () => new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US"),
    [locale],
  );
  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(MOBILE_BREAKPOINT_MEDIA_QUERY).matches;
  });
  const [mobileTab, setMobileTab] = useState<MobileLandingTab>("current");
  const [completedPageIndex, setCompletedPageIndex] = useState(0);
  const [guidePageIndex, setGuidePageIndex] = useState(0);
  const [completedAnimationStage, setCompletedAnimationStage] =
    useState<CarouselAnimationStage>("idle");
  const [guideAnimationStage, setGuideAnimationStage] =
    useState<CarouselAnimationStage>("idle");

  const [landingData, setLandingData] = useState<LandingPayload | null>(null);
  const [featuredPreviewItems, setFeaturedPreviewItems] = useState<
    LandingFeaturedPreviewItem[]
  >([]);
  const [landingError, setLandingError] = useState("");
  const currentGamePanelRef = useRef<HTMLDivElement | null>(null);
  const completedSwipeStartXRef = useRef<number | null>(null);
  const guideSwipeStartXRef = useRef<number | null>(null);
  const [currentGameSnapshotSize, setCurrentGameSnapshotSize] =
    useState<256 | 512>(LARGE_SNAPSHOT_SIZE);

  usePageRootClass("page-shell-root");
  usePublicSiteLocale(locale);
  useTrackVisitEvent("landing_visit");

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_MEDIA_QUERY);
    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setIsMobileLayout(event.matches);
    };

    mediaQuery.addEventListener("change", handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
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

  const handleParticipate = () => {
    window.location.assign("/lobby");
  };

  const currentGame = landingData?.currentGame ?? null;
  const mobileTabLabels = locale === "ko"
    ? {
        current: "진행중인 게임",
        completed: "완성된 캔버스",
        guide: "게임 소개",
      }
    : {
        current: "Current game",
        completed: "Completed",
        guide: "How to play",
      };
  const completedPageCount = featuredPreviewItems.length;
  const guidePageCount = siteContent.tutorial.cards.length;
  const activeCompletedPageIndex =
    completedPageCount > 0
      ? Math.min(completedPageIndex, completedPageCount - 1)
      : 0;
  const activeGuidePageIndex =
    guidePageCount > 0 ? Math.min(guidePageIndex, guidePageCount - 1) : 0;
  const activeCompletedItem =
    featuredPreviewItems[activeCompletedPageIndex] ?? null;
  const activeGuideCard =
    siteContent.tutorial.cards[activeGuidePageIndex] ?? null;
  const shouldShowCompletedPagination =
    mobileTab === "completed" && completedPageCount > 1;
  const shouldShowGuidePagination = mobileTab === "guide" && guidePageCount > 1;

  const resolveCarouselAnimationClassName = (
    animationStage: CarouselAnimationStage,
  ) => {
    switch (animationStage) {
      case "out-left":
        return "-translate-x-6 opacity-0";
      case "out-right":
        return "translate-x-6 opacity-0";
      case "in-left":
        return "-translate-x-4 opacity-0";
      case "in-right":
        return "translate-x-4 opacity-0";
      default:
        return "translate-x-0 opacity-100";
    }
  };

  const runCarouselTransition = (
    direction: "previous" | "next",
    count: number,
    setIndex: React.Dispatch<React.SetStateAction<number>>,
    setAnimationStage: React.Dispatch<React.SetStateAction<CarouselAnimationStage>>,
  ) => {
    if (count <= 1) {
      return;
    }

    setAnimationStage(direction === "next" ? "out-left" : "out-right");

    window.setTimeout(() => {
      setIndex((previousIndex) => {
        if (direction === "next") {
          return Math.min(previousIndex + 1, count - 1);
        }

        return Math.max(previousIndex - 1, 0);
      });
      setAnimationStage(direction === "next" ? "in-right" : "in-left");

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setAnimationStage("idle");
        });
      });
    }, 160);
  };

  const handleCompletedPaginationSelect = (index: number) => {
    if (index === activeCompletedPageIndex) {
      return;
    }

    runCarouselTransition(
      index > activeCompletedPageIndex ? "next" : "previous",
      completedPageCount,
      setCompletedPageIndex,
      setCompletedAnimationStage,
    );
  };

  const handleGuidePaginationSelect = (index: number) => {
    if (index === activeGuidePageIndex) {
      return;
    }

    runCarouselTransition(
      index > activeGuidePageIndex ? "next" : "previous",
      guidePageCount,
      setGuidePageIndex,
      setGuideAnimationStage,
    );
  };

  const handleCompletedTouchStart = (
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    completedSwipeStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleCompletedTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = completedSwipeStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    completedSwipeStartXRef.current = null;

    if (
      startX === null ||
      endX === null ||
      completedPageCount <= 1 ||
      Math.abs(endX - startX) < MOBILE_SWIPE_THRESHOLD_PX
    ) {
      return;
    }

    if (endX < startX) {
      runCarouselTransition(
        "next",
        completedPageCount,
        setCompletedPageIndex,
        setCompletedAnimationStage,
      );
      return;
    }

    runCarouselTransition(
      "previous",
      completedPageCount,
      setCompletedPageIndex,
      setCompletedAnimationStage,
    );
  };

  const handleGuideTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    guideSwipeStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleGuideTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = guideSwipeStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    guideSwipeStartXRef.current = null;

    if (
      startX === null ||
      endX === null ||
      guidePageCount <= 1 ||
      Math.abs(endX - startX) < MOBILE_SWIPE_THRESHOLD_PX
    ) {
      return;
    }

    if (endX < startX) {
      runCarouselTransition(
        "next",
        guidePageCount,
        setGuidePageIndex,
        setGuideAnimationStage,
      );
      return;
    }

    runCarouselTransition(
      "previous",
      guidePageCount,
      setGuidePageIndex,
      setGuideAnimationStage,
    );
  };

  useEffect(() => {
    const element = currentGamePanelRef.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateSnapshotSize = () => {
      const computedStyle = window.getComputedStyle(element);
      const horizontalPadding =
        Number.parseFloat(computedStyle.paddingLeft) +
        Number.parseFloat(computedStyle.paddingRight);
      const availableWidth = element.clientWidth - horizontalPadding;
      const nextSize =
        availableWidth >= LARGE_SNAPSHOT_SIZE
          ? LARGE_SNAPSHOT_SIZE
          : SMALL_SNAPSHOT_SIZE;

      setCurrentGameSnapshotSize((previousSize) =>
        previousSize === nextSize ? previousSize : nextSize,
      );
    };

    updateSnapshotSize();

    const observer = new ResizeObserver(() => {
      updateSnapshotSize();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [currentGame]);

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

      <main className="px-4 pb-4 pt-6 sm:px-6 md:pb-20 lg:px-10">
        <section className="mx-auto max-w-6xl rounded-[42px] bg-[#ff8870] px-5 py-6 text-white shadow-[0_40px_120px_rgba(39,46,55,0.24)] sm:px-8 sm:py-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_584px] xl:items-stretch">
            <div className="min-w-0 flex flex-col justify-center text-left">
              <div className="flex w-full max-w-3xl min-w-0 flex-col gap-5 sm:gap-6 lg:gap-[30px]">
                <div
                  className="w-full whitespace-pre-line break-keep text-[32px] font-semibold leading-tight sm:text-[36px] lg:text-[42px] xl:text-[50px]"
                  style={{ color: "#000000" }}
                >
                  {siteContent.hero.title}
                </div>
              </div>

              <div className="mt-8 flex w-full max-w-3xl items-end justify-between gap-4 sm:mt-10 xl:mt-[48px]">
                <p
                  className="max-w-[13rem] flex-1 whitespace-pre-line break-keep text-sm leading-6 sm:max-w-2xl sm:text-base sm:leading-7 lg:text-lg"
                  style={{ color: "rgba(0, 0, 0, 0.82)" }}
                >
                  {siteContent.hero.description}
                </p>
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

            <div
              ref={currentGamePanelRef}
              className="w-full max-w-[584px] rounded-[32px] bg-[#fff1ea]/14 p-3 sm:p-5 xl:justify-self-end"
            >
              {landingError ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-[28px] bg-[#f6ede5] px-6 text-center text-sm text-[#5f6368]">
                  {landingError}
                </div>
              ) : isMobileLayout ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 rounded-full bg-[#fff1ea]/24 p-1">
                    {(
                      [
                        ["current", mobileTabLabels.current],
                        ["completed", mobileTabLabels.completed],
                        ["guide", mobileTabLabels.guide],
                      ] as const
                    ).map(([tabKey, label]) => (
                      <button
                        key={tabKey}
                        type="button"
                        onClick={() => setMobileTab(tabKey)}
                        className={[
                          "rounded-full px-2 py-2 text-[11px] font-semibold transition sm:text-xs",
                          mobileTab === tabKey
                            ? "bg-white text-[#272E37]"
                            : "text-white/82",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {shouldShowCompletedPagination ? (
                    <MobilePaginationDots
                      count={completedPageCount}
                      activeIndex={activeCompletedPageIndex}
                      onSelect={handleCompletedPaginationSelect}
                    />
                  ) : null}

                  {shouldShowGuidePagination ? (
                    <MobilePaginationDots
                      count={guidePageCount}
                      activeIndex={activeGuidePageIndex}
                      onSelect={handleGuidePaginationSelect}
                    />
                  ) : null}

                  {mobileTab === "current" ? (
                    currentGame ? (
                      <div className="space-y-4">
                        <SnapshotImage
                          imageUrl={
                            currentGame.snapshotUrl ?? currentGame.fallbackImageUrl
                          }
                          alt={
                            currentGame.snapshotUrl
                              ? siteContent.currentGame.snapshotLabel
                              : siteContent.currentGame.fallbackPreviewAlt
                          }
                          size={currentGameSnapshotSize}
                        />

                        <div
                          className="mx-auto w-full max-w-full rounded-2xl bg-[#f6ede5] px-4 py-2 shadow-[0_10px_24px_rgba(39,46,55,0.05)]"
                          style={{ maxWidth: `${currentGameSnapshotSize}px` }}
                        >
                          <InfoStatRow
                            label={siteContent.currentGame.stats.grid}
                            value={`${currentGame.gridX} x ${currentGame.gridY}`}
                          />
                          <div className="h-px bg-[#ead7c8]" />
                          <InfoStatRow
                            label={siteContent.currentGame.stats.round}
                            value={`${formatNumber.format(
                              currentGame.currentRoundNumber,
                            )} / ${formatNumber.format(currentGame.totalRounds)}`}
                          />
                          <div className="h-px bg-[#ead7c8]" />
                          <InfoStatRow
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
                    )
                  ) : mobileTab === "completed" ? (
                    activeCompletedItem ? (
                      <div
                        className="space-y-4"
                        onTouchStart={handleCompletedTouchStart}
                        onTouchEnd={handleCompletedTouchEnd}
                      >
                        <div
                          className={[
                            "transition-all duration-200 ease-out",
                            resolveCarouselAnimationClassName(
                              completedAnimationStage,
                            ),
                          ].join(" ")}
                        >
                          <FeaturedPreviewCard
                            locale={locale}
                            gridX={activeCompletedItem.preview.gridX}
                            gridY={activeCompletedItem.preview.gridY}
                            item={activeCompletedItem}
                            labels={siteContent.featured.stats}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[420px] flex-col items-start justify-center rounded-[28px] bg-[#f6ede5] px-6 text-left">
                        <h2 className="text-2xl font-semibold text-[#272E37]">
                          {siteContent.featured.title}
                        </h2>
                        <p className="mt-4 whitespace-pre-line text-base leading-7 text-[#5f6368]">
                          {siteContent.featured.description}
                        </p>
                      </div>
                    )
                  ) : activeGuideCard ? (
                    <div
                      className="space-y-4"
                      onTouchStart={handleGuideTouchStart}
                      onTouchEnd={handleGuideTouchEnd}
                    >
                      <div
                        className={[
                          "transition-all duration-200 ease-out",
                          resolveCarouselAnimationClassName(guideAnimationStage),
                        ].join(" ")}
                      >
                        <article className="overflow-hidden rounded-[30px] bg-white shadow-[0_24px_70px_rgba(39,46,55,0.08)]">
                          <div className="bg-[linear-gradient(180deg,#fff4e9_0%,#f6ede5_100%)] p-4">
                            <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-[24px] shadow-[0_24px_60px_rgba(39,46,55,0.10)]">
                              <div className="aspect-video w-full">
                                <img
                                  src={activeGuideCard.imageUrl}
                                  alt={activeGuideCard.imageAlt}
                                  className="block h-full w-full object-contain"
                                  draggable={false}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="px-5 py-5 text-left">
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-semibold text-[#272E37]">
                                {activeGuideCard.title}
                              </h3>
                              {activeGuideCard.iconUrl ? (
                                <img
                                  src={activeGuideCard.iconUrl}
                                  alt=""
                                  aria-hidden="true"
                                  className="h-12 w-12 flex-none object-contain"
                                  draggable={false}
                                />
                              ) : null}
                            </div>
                            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#5f6368]">
                              {activeGuideCard.description}
                            </p>
                          </div>
                        </article>
                      </div>
                    </div>
                  ) : null}
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
                    size={currentGameSnapshotSize}
                  />

                  <div
                    className="mx-auto w-full max-w-full rounded-2xl bg-[#f6ede5] px-4 py-2 shadow-[0_10px_24px_rgba(39,46,55,0.05)]"
                    style={{ maxWidth: `${currentGameSnapshotSize}px` }}
                  >
                    <InfoStatRow
                      label={siteContent.currentGame.stats.grid}
                      value={`${currentGame.gridX} x ${currentGame.gridY}`}
                    />
                    <div className="h-px bg-[#ead7c8]" />
                    <InfoStatRow
                      label={siteContent.currentGame.stats.round}
                      value={`${formatNumber.format(
                        currentGame.currentRoundNumber,
                      )} / ${formatNumber.format(currentGame.totalRounds)}`}
                    />
                    <div className="h-px bg-[#ead7c8]" />
                    <InfoStatRow
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

        {!isMobileLayout ? (
          <>
            <FeaturedPreviewSection
              locale={locale}
              items={featuredPreviewItems}
              labels={{
                title: siteContent.featured.title,
                description: siteContent.featured.description,
                participants: siteContent.featured.stats.participants,
                votes: siteContent.featured.stats.votes,
                topVoter: siteContent.featured.stats.topVoter,
              }}
            />

            <section className="mx-auto mt-10 max-w-6xl">
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
          </>
        ) : null}
      </main>

      <footer className="border-t border-[#20262f] bg-[#272E37] px-4 pb-10 pt-7 text-[#f6ede5] sm:px-6 sm:py-10 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-5">
          <div className="flex min-w-0 flex-col items-start gap-3 md:flex-row md:items-center md:gap-4">
            <div className="inline-flex items-center gap-3">
              <BrandLogo variant="symbol" className="w-7" />
              <BrandLogo variant="wordmarkLight" className="w-20" />
            </div>
            <p className="max-w-2xl whitespace-pre-line text-sm leading-6 text-slate-300">
              {siteContent.footer.description}
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold md:justify-end">
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
