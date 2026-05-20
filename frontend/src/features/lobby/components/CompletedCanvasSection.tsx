import { useEffect, useRef, useState, type TouchEvent } from "react";
import { landingApi } from "@/features/landing/api/landing.api";
import CanvasResultCard from "@/features/canvas-result/components/CanvasResultCard";
import CanvasResultModal from "@/features/canvas-result/components/CanvasResultModal";
import type {
  LandingCompletedPreviewDetail,
  LandingFeaturedPreviewItem,
  LandingFeaturedPreviewPayload,
} from "@/features/landing/model/landing.types";
import { useI18n } from "@/shared/i18n";
import { DropdownSelect } from "@/shared/ui/dropdown-select";

type CompletedCanvasSectionProps = {
  scope: "plaza" | "public";
  preset: "today" | "7d" | "30d";
  onChangeScope: (scope: "plaza" | "public") => void;
  onChangePreset: (preset: "today" | "7d" | "30d") => void;
  mobileMode?: boolean;
  active?: boolean;
};

type CompletedSort = "latest" | "oldest";
type CompletedPagination = NonNullable<LandingFeaturedPreviewPayload["pagination"]>;

const EMPTY_PAGINATION: CompletedPagination = {
  page: 1,
  limit: 8,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
};
const MOBILE_SWIPE_THRESHOLD_PX = 40;

function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number,
  windowSize = 3,
) {
  if (totalPages <= 0) {
    return [];
  }

  const startPage = Math.floor((currentPage - 1) / windowSize) * windowSize + 1;
  const endPage = Math.min(totalPages, startPage + windowSize - 1);

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );
}

function buildCompletedRange(preset: "today" | "7d" | "30d") {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (preset === "7d") {
    start.setDate(start.getDate() - 6);
  } else if (preset === "30d") {
    start.setDate(start.getDate() - 29);
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  };
}

function formatDateTime(value: string, locale: "ko" | "en") {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function CompletedPaginationControls({
  page,
  totalPages,
  onSelect,
  previousLabel,
  nextLabel,
}: {
  page: number;
  totalPages: number;
  onSelect: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePageNumbers(page, totalPages, 3);
  const currentWindowStart = visiblePages[0] ?? 1;
  const currentWindowEnd = visiblePages[visiblePages.length - 1] ?? totalPages;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-[24px] border border-[#ead7c8] bg-white px-3 py-3">
      <button
        type="button"
        disabled={currentWindowStart <= 1}
        onClick={() => onSelect(Math.max(currentWindowStart - 3, 1))}
        className="inline-flex h-10 min-w-10 items-center justify-center border-b-2 border-transparent px-3 text-sm font-semibold text-[#6c5a4d] transition hover:border-[#d9c7b7] hover:text-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={previousLabel}
      >
        &lt;
      </button>

      <div className="flex items-center gap-0.5">
        {visiblePages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onSelect(pageNumber)}
            className={[
              "inline-flex h-10 min-w-10 items-center justify-center border-b-2 px-3 text-sm font-semibold transition",
              pageNumber === page
                ? "border-[#2d2d2d] text-[#2d2d2d]"
                : "border-transparent text-[#6c5a4d] hover:border-[#d9c7b7] hover:text-[#2d2d2d]",
            ].join(" ")}
          >
            {pageNumber}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={currentWindowEnd >= totalPages}
        onClick={() => onSelect(Math.min(currentWindowStart + 3, totalPages))}
        className="inline-flex h-10 min-w-10 items-center justify-center border-b-2 border-transparent px-3 text-sm font-semibold text-[#6c5a4d] transition hover:border-[#d9c7b7] hover:text-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={nextLabel}
      >
        &gt;
      </button>
    </div>
  );
}

export default function CompletedCanvasSection({
  scope,
  preset,
  onChangeScope,
  onChangePreset,
  mobileMode = false,
  active = true,
}: CompletedCanvasSectionProps) {
  const { locale, t } = useI18n();
  const [sort, setSort] = useState<CompletedSort>("latest");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<LandingFeaturedPreviewItem[]>([]);
  const [pagination, setPagination] = useState<CompletedPagination>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<LandingCompletedPreviewDetail | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const loadedRequestKeyRef = useRef<string | null>(null);

  const handleChangeScope = (nextScope: "plaza" | "public") => {
    setPage(1);
    onChangeScope(nextScope);
  };

  const handleChangePreset = (nextPreset: "today" | "7d" | "30d") => {
    setPage(1);
    onChangePreset(nextPreset);
  };

  const handleChangeSort = (nextSort: CompletedSort) => {
    setPage(1);
    setSort(nextSort);
  };

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    let cancelled = false;
    const { dateFrom, dateTo } = buildCompletedRange(preset);
    const requestKey = [
      scope,
      preset,
      sort,
      page,
      mobileMode ? 1 : 8,
    ].join(":");

    if (loadedRequestKeyRef.current === requestKey) {
      return undefined;
    }

    const loadCompletedPreviews = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await landingApi.getCompletedPreviews({
          scope,
          dateFrom,
          dateTo,
          page,
          limit: mobileMode ? 1 : 8,
          sort,
        });

        if (cancelled) {
          return;
        }

        setItems(data.items);
        setPagination(data.pagination ?? EMPTY_PAGINATION);
        loadedRequestKeyRef.current = requestKey;
      } catch {
        if (cancelled) {
          return;
        }

        setItems([]);
        setPagination(EMPTY_PAGINATION);
        setError(t("lobby.completed.loadFailed"));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCompletedPreviews();

    return () => {
      cancelled = true;
    };
  }, [active, mobileMode, page, preset, scope, sort, t]);

  const handleOpenDetail = async (canvasId: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);

    try {
      const { data } = await landingApi.getCompletedPreviewDetail(canvasId);
      setDetail(data);
    } catch {
      setDetail(null);
      setDetailError(t("lobby.completed.detailLoadFailed"));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!mobileMode || pagination.totalPages <= 1) {
      touchStartXRef.current = null;
      return;
    }

    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;

    if (
      startX === null ||
      endX === null ||
      Math.abs(endX - startX) < MOBILE_SWIPE_THRESHOLD_PX
    ) {
      return;
    }

    if (endX < startX && pagination.hasNextPage) {
      setPage((current) => current + 1);
      return;
    }

    if (endX > startX && pagination.page > 1) {
      setPage((current) => Math.max(1, current - 1));
    }
  };

  const activeItem = items[0] ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[28px] bg-[#fbf7f2] p-6">
      {mobileMode ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm font-semibold text-[#6c5a4d]">
              {t("lobby.completed.filter.scopeLabel")}
            </span>
            <DropdownSelect
              value={scope}
              onChange={handleChangeScope}
              options={[
                { value: "plaza", label: t("lobby.completed.scope.plaza") },
                { value: "public", label: t("lobby.completed.scope.public") },
              ]}
              className="w-full"
              triggerClassName="h-11 rounded-full border border-[#d9cdc1] bg-white px-4 text-sm font-semibold text-[#2d2d2d]"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm font-semibold text-[#6c5a4d]">
              {t("lobby.completed.filter.presetLabel")}
            </span>
            <DropdownSelect
              value={preset}
              onChange={handleChangePreset}
              options={[
                { value: "today", label: t("lobby.completed.preset.today") },
                { value: "7d", label: t("lobby.completed.preset.7d") },
                { value: "30d", label: t("lobby.completed.preset.30d") },
              ]}
              className="w-full"
              triggerClassName="h-11 rounded-full border border-[#d9cdc1] bg-white px-4 text-sm font-semibold text-[#2d2d2d]"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm font-semibold text-[#6c5a4d]">
              {t("lobby.completed.filter.sortLabel")}
            </span>
            <DropdownSelect
              value={sort}
              onChange={handleChangeSort}
              options={[
                { value: "latest", label: t("lobby.completed.sort.latest") },
                { value: "oldest", label: t("lobby.completed.sort.oldest") },
              ]}
              className="w-full"
              triggerClassName="h-11 rounded-full border border-[#d9cdc1] bg-white px-4 text-sm font-semibold text-[#2d2d2d]"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm leading-6 text-[#5f6368]">
              {t("lobby.completed.description")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-full border border-[#d9cdc1] bg-white p-1">
              <button
                type="button"
                onClick={() => handleChangeScope("plaza")}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${scope === "plaza" ? "bg-[#272E37] text-white" : "text-[#5f6368]"
                  }`}
              >
                {t("lobby.completed.scope.plaza")}
              </button>
              <button
                type="button"
                onClick={() => handleChangeScope("public")}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${scope === "public" ? "bg-[#272E37] text-white" : "text-[#5f6368]"
                  }`}
              >
                {t("lobby.completed.scope.public")}
              </button>
            </div>
            <div className="flex rounded-full border border-[#d9cdc1] bg-white p-1">
              {(["today", "7d", "30d"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChangePreset(value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${preset === value ? "bg-[#272E37] text-white" : "text-[#5f6368]"
                    }`}
                >
                  {value === "today"
                    ? t("lobby.completed.preset.today")
                    : value === "7d"
                      ? t("lobby.completed.preset.7d")
                      : t("lobby.completed.preset.30d")}
                </button>
              ))}
            </div>
            <DropdownSelect
              value={sort}
              onChange={handleChangeSort}
              options={[
                { value: "latest", label: t("lobby.completed.sort.latest") },
                { value: "oldest", label: t("lobby.completed.sort.oldest") },
              ]}
              triggerClassName="rounded-full border border-[#d9cdc1] bg-white px-4 py-2.5 text-sm font-semibold text-[#2d2d2d]"
            />
          </div>
        </div>
      )}

      <div className={`${mobileMode ? "mt-4" : "mt-8"} min-h-0 flex-1 ${mobileMode ? "" : "overflow-y-auto pr-1"}`}>
        {loading ? (
          <div className="text-sm text-[#5f6368]">{t("common.loading")}</div>
        ) : error ? (
          <div className="text-sm text-[#d14d28]">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#d9cdc1] bg-white px-6 py-10 text-sm text-[#5f6368]">
            {t("lobby.completed.empty")}
          </div>
        ) : mobileMode ? (
          <div className="space-y-4">
            <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <CanvasResultCard
                key={`${activeItem?.preview.canvasId ?? "empty"}-${pagination.page}`}
                imageUrl={activeItem?.webpUrl ?? null}
                secondaryImageUrl={activeItem?.resultImageUrl ?? null}
                imageAlt={t("mypage.participations.resultImageAlt")}
                emptyMessage={t("mypage.participations.resultUnavailable")}
                gridX={activeItem?.preview.gridX}
                gridY={activeItem?.preview.gridY}
                footer={
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#cf6c45]">
                      {t("mypage.participations.participatedAt")}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#2d2d2d]">
                      {activeItem
                        ? formatDateTime(activeItem.preview.endedAt, locale)
                        : "-"}
                    </p>
                  </div>
                }
                actionLabel={t("mypage.participations.viewResult")}
                onAction={() => {
                  if (!activeItem) {
                    return;
                  }

                  void handleOpenDetail(activeItem.preview.canvasId);
                }}
              />
            </div>

            <CompletedPaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              onSelect={setPage}
              previousLabel={t("mypage.pagination.previous")}
              nextLabel={t("mypage.pagination.next")}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {items.map((item) => (
                <CanvasResultCard
                  key={`${item.preview.canvasId}-${item.preview.endedAt}`}
                  imageUrl={item.webpUrl}
                  secondaryImageUrl={item.resultImageUrl ?? null}
                  imageAlt={t("mypage.modal.snapshotAlt")}
                  emptyMessage={t("mypage.participations.resultUnavailable")}
                  gridX={item.preview.gridX}
                  gridY={item.preview.gridY}
                  footer={
                    <div className="space-y-3 text-center">
                      <div>
                        <p className="text-sm font-medium leading-6 text-[#2d2d2d]">
                          {formatDateTime(item.preview.endedAt, locale)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#cf6c45]">
                          {t("mypage.modal.topVoter")}
                        </p>
                        <p className="mt-2 text-sm font-medium leading-6 text-[#2d2d2d]">
                          {item.preview.topVoter.name ?? t("mypage.modal.emptyValue")}
                        </p>
                      </div>
                    </div>
                  }
                  actionLabel={t("mypage.participations.viewResult")}
                  onAction={() => handleOpenDetail(item.preview.canvasId)}
                />
              ))}
            </div>

            <CompletedPaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              onSelect={setPage}
              previousLabel={t("mypage.pagination.previous")}
              nextLabel={t("mypage.pagination.next")}
            />
          </div>
        )}
      </div>

      {detailOpen ? (
        detailLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,25,20,0.52)] px-4 py-6">
            <div className="rounded-[28px] border border-[#ead7c8] bg-white px-6 py-5 text-sm font-medium text-[#7a685b] shadow-[0_18px_50px_rgba(39,46,55,0.08)]">
              {t("common.loading")}
            </div>
          </div>
        ) : detailError ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,25,20,0.52)] px-4 py-6">
            <div className="rounded-[28px] border border-[#ead7c8] bg-white px-6 py-5 shadow-[0_18px_50px_rgba(39,46,55,0.08)]">
              <p className="text-sm font-medium text-[#c04f2c]">{detailError}</p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="rounded-full border border-[#d9c7b7] px-4 py-2 text-sm font-semibold text-[#6c5a4d]"
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          </div>
        ) : detail ? (
          <CanvasResultModal
            detail={detail}
            open={detailOpen}
            onClose={() => setDetailOpen(false)}
            labels={{
              title: t("mypage.participations.viewResult"),
              close: t("common.close"),
              snapshotAlt: t("mypage.modal.snapshotAlt"),
              noSnapshot: t("mypage.participations.resultUnavailable"),
              size: t("mypage.modal.size"),
              endedAt: t("mypage.modal.endedAt"),
              totalRounds: t("mypage.modal.totalRounds"),
              participantCount: t("mypage.modal.participantCount"),
              totalVotes: t("mypage.modal.totalVotes"),
              topVoter: t("mypage.modal.topVoter"),
              emptyValue: t("mypage.modal.emptyValue"),
              participantList: t("lobby.completed.participantList"),
            }}
          />
        ) : null
      ) : null}
    </div>
  );
}
