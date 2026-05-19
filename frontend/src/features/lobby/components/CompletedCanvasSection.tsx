import { useEffect, useState } from "react";
import { landingApi } from "@/features/landing/api/landing.api";
import CanvasResultCard from "@/features/canvas-result/components/CanvasResultCard";
import CanvasResultModal from "@/features/canvas-result/components/CanvasResultModal";
import type {
  LandingCompletedPreviewDetail,
  LandingFeaturedPreviewItem,
  LandingFeaturedPreviewPayload,
} from "@/features/landing/model/landing.types";
import { useI18n } from "@/shared/i18n";

interface CompletedCanvasSectionProps {
  scope: "plaza" | "public";
  preset: "today" | "7d" | "30d";
  onChangeScope: (scope: "plaza" | "public") => void;
  onChangePreset: (preset: "today" | "7d" | "30d") => void;
}

type CompletedSort = "latest" | "oldest";
type CompletedPagination = NonNullable<
  LandingFeaturedPreviewPayload["pagination"]
>;

const EMPTY_PAGINATION: CompletedPagination = {
  page: 1,
  limit: 8,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
};

function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number,
  windowSize = 5,
) {
  if (totalPages <= 0) {
    return [];
  }

  const halfWindow = Math.floor(windowSize / 2);
  let startPage = Math.max(1, currentPage - halfWindow);
  let endPage = Math.min(totalPages, startPage + windowSize - 1);

  if (endPage - startPage + 1 < windowSize) {
    startPage = Math.max(1, endPage - windowSize + 1);
  }

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

export default function CompletedCanvasSection({
  scope,
  preset,
  onChangeScope,
  onChangePreset,
}: CompletedCanvasSectionProps) {
  const { locale, t } = useI18n();
  const [sort, setSort] = useState<CompletedSort>("latest");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<LandingFeaturedPreviewItem[]>([]);
  const [pagination, setPagination] = useState<CompletedPagination>(
    EMPTY_PAGINATION,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<LandingCompletedPreviewDetail | null>(null);

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
    let cancelled = false;
    const { dateFrom, dateTo } = buildCompletedRange(preset);

    const loadCompletedPreviews = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await landingApi.getCompletedPreviews({
          scope,
          dateFrom,
          dateTo,
          page,
          limit: 8,
          sort,
        });

        if (cancelled) {
          return;
        }

        setItems(data.items);
        setPagination(data.pagination ?? EMPTY_PAGINATION);
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
  }, [page, preset, scope, sort, t]);

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

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[28px] bg-[#fbf7f2] p-6">
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
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                scope === "plaza"
                  ? "bg-[#272E37] text-white"
                  : "text-[#5f6368]"
              }`}
            >
              {t("lobby.completed.scope.plaza")}
            </button>
            <button
              type="button"
              onClick={() => handleChangeScope("public")}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                scope === "public"
                  ? "bg-[#272E37] text-white"
                  : "text-[#5f6368]"
              }`}
            >
              {t("lobby.completed.scope.public")}
            </button>
          </div>
          <div className="flex rounded-full border border-[#d9cdc1] bg-white p-1">
            {(
              [
                ["today"],
                ["7d"],
                ["30d"],
              ] as const
            ).map(([value]) => (
              <button
                key={value}
                type="button"
                onClick={() => handleChangePreset(value)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  preset === value
                    ? "bg-[#272E37] text-white"
                    : "text-[#5f6368]"
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
          <label className="inline-flex self-start rounded-full border border-[#d9cdc1] bg-white px-4 py-2.5">
            <select
              value={sort}
              onChange={(event) => {
                handleChangeSort(event.target.value as CompletedSort);
              }}
              className="bg-transparent pr-6 text-sm font-semibold text-[#2d2d2d] outline-none"
            >
              <option value="latest">{t("lobby.completed.sort.latest")}</option>
              <option value="oldest">{t("lobby.completed.sort.oldest")}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-sm text-[#5f6368]">{t("common.loading")}</div>
        ) : error ? (
          <div className="text-sm text-[#d14d28]">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#d9cdc1] bg-white px-6 py-10 text-sm text-[#5f6368]">
            {t("lobby.completed.empty")}
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
                          {item.preview.topVoter.name ??
                            t("mypage.modal.emptyValue")}
                        </p>
                      </div>
                    </div>
                  }
                  actionLabel={t("mypage.participations.viewResult")}
                  onAction={() => handleOpenDetail(item.preview.canvasId)}
                />
              ))}
            </div>

            {pagination.totalPages > 1 ? (
              <div className="flex items-center justify-center gap-2 rounded-[24px] border border-[#ead7c8] bg-white px-5 py-4">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex h-10 w-10 items-center justify-center text-[#6c5a4d] transition hover:text-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t("mypage.pagination.previous")}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12.5 4.5L7 10l5.5 5.5" />
                  </svg>
                </button>

                <div className="flex items-center gap-1">
                  {getVisiblePageNumbers(
                    pagination.page,
                    pagination.totalPages,
                  ).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={[
                        "inline-flex h-10 min-w-10 items-center justify-center border-b-2 px-3 text-sm font-semibold transition",
                        pageNumber === pagination.page
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
                  disabled={!pagination.hasNextPage}
                  onClick={() =>
                    setPage((current) =>
                      pagination.hasNextPage ? current + 1 : current,
                    )
                  }
                  className="inline-flex h-10 w-10 items-center justify-center text-[#6c5a4d] transition hover:text-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t("mypage.pagination.next")}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7.5 4.5L13 10l-5.5 5.5" />
                  </svg>
                </button>
              </div>
            ) : null}
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
              <button
                type="button"
                onClick={() => {
                  setDetailOpen(false);
                  setDetailError(null);
                }}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#2d2d2d] px-4 text-sm font-semibold text-white"
              >
                {t("common.confirm")}
              </button>
            </div>
          </div>
        ) : (
          <CanvasResultModal
            open={detailOpen}
            detail={detail}
            labels={{
              title: t("mypage.modal.title"),
              close: t("mypage.modal.close"),
              snapshotAlt: t("mypage.modal.snapshotAlt"),
              noSnapshot: t("mypage.modal.noSnapshot"),
              size: t("mypage.modal.size"),
              endedAt: t("mypage.modal.endedAt"),
              totalRounds: t("mypage.modal.totalRounds"),
              participantCount: t("mypage.modal.participantCount"),
              totalVotes: t("mypage.modal.totalVotes"),
              topVoter: t("mypage.modal.topVoter"),
              emptyValue: t("mypage.modal.emptyValue"),
              participantList: t("lobby.completed.participantList"),
            }}
            onClose={() => {
              setDetailOpen(false);
              setDetail(null);
              setDetailError(null);
            }}
          />
        )
      ) : null}
    </div>
  );
}
