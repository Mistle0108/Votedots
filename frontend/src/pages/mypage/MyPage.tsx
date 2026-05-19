import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, logoutToLobby, type Voter } from "@/features/auth";
import { mypageApi } from "@/features/mypage/api/mypage.api";
import type {
  MypageParticipationDetailData,
  MypageParticipationItem,
  MypagePagination,
  MypageStats,
} from "@/features/mypage/model/mypage.types";
import { clearStoredRoomSessionContext } from "@/features/room/model/room-session-context";
import { usePageRootClass } from "@/shared/hooks/use-page-root-class";
import { useI18n } from "@/shared/i18n";
import { translateServerMessage } from "@/shared/i18n/server-messages";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Button } from "@/shared/ui/button";
import MypageResultModal from "@/features/mypage/components/MypageResultModal";

type SizeFilterValue = "all" | "32x32" | "64x64" | "128x128" | "256x256";
type VisibilityFilterValue = "all" | "public" | "private";

const SIZE_FILTERS: SizeFilterValue[] = [
  "all",
  "32x32",
  "64x64",
  "128x128",
  "256x256",
];
const VISIBILITY_FILTERS: VisibilityFilterValue[] = ["all", "public", "private"];

const EMPTY_PAGINATION: MypagePagination = {
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

function formatDate(value: string, locale: "ko" | "en") {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string, locale: "ko" | "en") {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function resolveErrorMessage(
  error: unknown,
  locale: "ko" | "en",
  t: (key: string) => string,
  fallbackKey: string,
) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return translateServerMessage(error.response.data.message, t, locale);
  }

  return t(fallbackKey);
}

function isInvalidCredentialsError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    (error.response.data.message === "AUTH_INVALID_CREDENTIALS" ||
      error.response.data.message === "?꾩씠???먮뒗 鍮꾨?踰덊샇媛 ?щ컮瑜댁? ?딆븘??" ||
      error.response.data.message === "Your username or password is incorrect.")
  );
}

function isUnauthorizedError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    error.response.status === 401
  );
}

function buildSizeCounts(stats: MypageStats | null) {
  const baseCounts: Record<Exclude<SizeFilterValue, "all">, number> = {
    "32x32": 0,
    "64x64": 0,
    "128x128": 0,
    "256x256": 0,
  };

  for (const item of stats?.participationCountBySize ?? []) {
    if (item.size in baseCounts) {
      baseCounts[item.size as Exclude<SizeFilterValue, "all">] = item.count;
    }
  }

  return baseCounts;
}

function sanitizePasswordValue(value: string) {
  return value.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, "");
}

function TopMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 px-6 py-2 text-center sm:px-10">
      <p className="px-3 text-sm font-medium text-[#7a685b]">{label}</p>
      <p className="mt-[18px] px-3 text-[44px] leading-none font-semibold tracking-[-0.05em] text-[#2d2d2d]">
        {value}
      </p>
    </div>
  );
}

function PasswordVisibilityButton({
  visible,
  onClick,
  label,
}: {
  visible: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute top-1/2 right-4 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#8a796c] transition hover:text-[#2d2d2d]"
    >
      {visible ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3l18 18" />
          <path d="M10.6 10.7a2 2 0 002.7 2.7" />
          <path d="M9.9 5.2A10.9 10.9 0 0112 5c5 0 9.3 3.1 11 7-1 2.3-2.7 4.2-4.8 5.4" />
          <path d="M6.2 6.3C4.2 7.5 2.7 9.4 1 12c.9 2.1 2.4 3.9 4.2 5.1" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

function ParticipationCard({
  item,
  locale,
  onOpenDetail,
  t,
}: {
  item: MypageParticipationItem;
  locale: "ko" | "en";
  onOpenDetail: (canvasId: number) => void;
  t: (key: string) => string;
}) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-[#ead7c8] bg-white shadow-[0_18px_50px_rgba(39,46,55,0.08)]">
      <div className="aspect-square overflow-hidden bg-[linear-gradient(180deg,#f7efe7_0%,#efe0d2_100%)]">
        {item.resultImageUrl ? (
          <img
            src={item.resultImageUrl}
            alt={t("mypage.participations.resultImageAlt")}
            className="h-full w-full object-contain"
            style={{ imageRendering: "pixelated" }}
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-[#8a796c]">
            {t("mypage.participations.resultUnavailable")}
          </div>
        )}
      </div>

      <div className="space-y-4 px-5 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#cf6c45]">
            {t("mypage.participations.participatedAt")}
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-[#2d2d2d]">
            {formatDateTime(item.participatedAt, locale)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenDetail(item.canvasId)}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#d96d43] px-4 text-sm font-semibold text-white transition hover:bg-[#c95d34]"
        >
          {t("mypage.participations.viewResult")}
        </button>
      </div>
    </article>
  );
}

export default function MyPage() {
  const navigate = useNavigate();
  const { formatNumber, locale, t } = useI18n();
  usePageRootClass("page-shell-root");

  const [profile, setProfile] = useState<Voter | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilterValue>("all");
  const [sizeFilter, setSizeFilter] = useState<SizeFilterValue>("all");
  const [page, setPage] = useState(1);
  const [participations, setParticipations] = useState<MypageParticipationItem[]>([]);
  const [pagination, setPagination] = useState<MypagePagination>(EMPTY_PAGINATION);
  const [participationsLoading, setParticipationsLoading] = useState(false);
  const [participationsError, setParticipationsError] = useState<string | null>(null);
  const [stats, setStats] = useState<MypageStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MypageParticipationDetailData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [changePasswordSuccessOpen, setChangePasswordSuccessOpen] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [showWithdrawPassword, setShowWithdrawPassword] = useState(false);
  const pendingFilterScrollYRef = useRef<number | null>(null);
  const sizeCounts = buildSizeCounts(stats);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);
      setPageError(null);

      try {
        const { data } = await authApi.me();

        if (cancelled) {
          return;
        }

        setProfile(data.voter);
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isUnauthorizedError(error)) {
          navigate("/login", { replace: true });
          return;
        }

        setPageError(
          resolveErrorMessage(error, locale, t, "mypage.error.profileLoadFailed"),
        );
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [locale, navigate, t]);

  useEffect(() => {
    if (participationsLoading || pendingFilterScrollYRef.current === null) {
      return;
    }

    const savedScrollY = pendingFilterScrollYRef.current;
    pendingFilterScrollYRef.current = null;

    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: savedScrollY,
        behavior: "auto",
      });
    });
  }, [participations, participationsLoading]);

  useEffect(() => {
    let cancelled = false;

    const loadParticipations = async () => {
      setParticipationsLoading(true);
      setParticipationsError(null);

      try {
        const { data } = await mypageApi.getParticipations({
          page,
          limit: 8,
          size: sizeFilter === "all" ? undefined : sizeFilter,
          visibility:
            visibilityFilter === "all" ? undefined : visibilityFilter,
        });

        if (cancelled) {
          return;
        }

        setParticipations(data.items);
        setPagination(data.pagination);
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isUnauthorizedError(error)) {
          navigate("/login", { replace: true });
          return;
        }

        setParticipationsError(
          resolveErrorMessage(
            error,
            locale,
            t,
            "mypage.error.participationsLoadFailed",
          ),
        );
      } finally {
        if (!cancelled) {
          setParticipationsLoading(false);
        }
      }
    };

    void loadParticipations();

    return () => {
      cancelled = true;
    };
  }, [locale, navigate, page, sizeFilter, t, visibilityFilter]);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      setStatsLoading(true);
      setStatsError(null);

      try {
        const { data } = await mypageApi.getStats();

        if (cancelled) {
          return;
        }

        setStats(data.stats);
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isUnauthorizedError(error)) {
          navigate("/login", { replace: true });
          return;
        }

        setStatsError(
          resolveErrorMessage(error, locale, t, "mypage.error.statsLoadFailed"),
        );
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [locale, navigate, t]);

  const handleOpenDetail = async (canvasId: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);

    try {
      const { data } = await mypageApi.getParticipationDetail(canvasId);
      setDetail(data.participation);
    } catch (error) {
      setDetail(null);
      setDetailError(
        resolveErrorMessage(error, locale, t, "mypage.error.detailLoadFailed"),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenChangePasswordModal = () => {
    setAccountError(null);
    setChangePasswordModalOpen(true);
  };

  const handleCloseChangePasswordModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowNewPasswordConfirm(false);
    setAccountError(null);
    setChangePasswordModalOpen(false);
  };

  const handleCloseChangePasswordSuccess = () => {
    setChangePasswordSuccessOpen(false);
    handleCloseChangePasswordModal();
  };

  const handleOpenWithdrawModal = () => {
    setWithdrawError(null);
    setWithdrawModalOpen(true);
  };

  const handleCloseWithdrawModal = () => {
    setWithdrawPassword("");
    setShowWithdrawPassword(false);
    setWithdrawError(null);
    setWithdrawModalOpen(false);
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);

    if (newPassword !== newPasswordConfirm) {
      setAccountError(t("mypage.account.passwordMismatch"));
      return;
    }

    setChangePasswordLoading(true);

    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setChangePasswordSuccessOpen(true);
    } catch (error) {
      setAccountError(
        isInvalidCredentialsError(error)
          ? t("mypage.account.currentPasswordInvalid")
          : resolveErrorMessage(error, locale, t, "mypage.error.changePasswordFailed"),
      );
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleWithdraw = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWithdrawError(null);
    setWithdrawLoading(true);

    try {
      await authApi.withdraw(withdrawPassword);
      clearStoredRoomSessionContext();
      navigate("/login", { replace: true });
    } catch (error) {
      setWithdrawError(
        resolveErrorMessage(error, locale, t, "mypage.error.withdrawFailed"),
      );
      setWithdrawLoading(false);
    }
  };

  const handlePasswordInputChange =
    (setter: (value: string) => void) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        setter(sanitizePasswordValue(event.target.value));
      };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8efe6_0%,#fffdf9_100%)] px-4 py-12 text-[#2d2d2d]">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-medium text-[#7a685b]">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(217,109,67,0.18),transparent_25%),linear-gradient(180deg,#f8efe6_0%,#fffdf9_100%)] px-4 py-6 text-[#2d2d2d] sm:px-6 lg:px-10">
      <main className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <BrandLogo variant="wordmark" className="w-34" />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="rounded-full border-[#d9c7b7] bg-white px-4 text-[#6c5a4d] hover:bg-[#f6eee7]"
              onClick={() => navigate("/lobby")}
            >
              {t("mypage.backToLobby")}
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-[#d9c7b7] bg-white px-4 text-[#6c5a4d] hover:bg-[#f6eee7]"
              onClick={() => void logoutToLobby(navigate)}
            >
              {t("session.logout")}
            </Button>
          </div>
        </div>

        <section className="space-y-5">
          {pageError ? (
            <p className="text-sm font-medium text-[#c04f2c]">{pageError}</p>
          ) : null}

          <div className="grid items-stretch gap-0 overflow-hidden rounded-[32px] border border-[#ddcfbf] bg-[#fdf8f1] shadow-[0_18px_60px_rgba(39,46,55,0.08)] xl:grid-cols-[minmax(0,5fr)_minmax(320px,2fr)]">
            <section className="order-2 px-6 py-6 sm:px-8 sm:py-7 xl:order-1">
              <p className="text-sm font-medium text-[#7a685b]">
                {t("mypage.participations.notice")}
              </p>

              {statsError ? (
                <p className="mt-4 text-sm font-medium text-[#c04f2c]">{statsError}</p>
              ) : null}

              <div className="mt-7 grid gap-6 border-b border-[#e6d8c9] pb-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[#000000]">
                <TopMetric
                  label={t("mypage.summary.totalParticipatedCanvasCount")}
                  value={formatNumber(stats?.totalParticipatedCanvasCount ?? 0)}
                />
                <TopMetric
                  label={t("mypage.summary.totalUsedVoteCount")}
                  value={formatNumber(stats?.totalUsedVoteCount ?? 0)}
                />
                <TopMetric
                  label={t("mypage.summary.topVoterAchievedCount")}
                  value={formatNumber(stats?.topVoterAchievedCount ?? 0)}
                />
              </div>

              <div className="mt-8">
                <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#2d2d2d]">
                  {t("mypage.stats.sizeBreakdownTitle")}
                </h2>

                {statsLoading ? (
                  <p className="mt-4 text-sm font-medium text-[#7a685b]">
                    {t("common.loading")}
                  </p>
                ) : (
                  <div className="mt-4 overflow-hidden rounded-[24px] border border-[#e6d8c9] bg-white">
                    <div className="grid sm:grid-cols-4">
                      {(["32x32", "64x64", "128x128", "256x256"] as const).map(
                        (size, index) => (
                          <article
                            key={size}
                            className={[
                              "px-6 py-5 text-center",
                              index > 0 ? "border-t border-[#efe3d7] sm:border-l sm:border-t-0" : "",
                            ].join(" ")}
                          >
                            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#d96d43]">
                              {size}
                            </p>
                            <p className="mt-3 text-[48px] font-semibold leading-none tracking-[-0.05em] text-[#2d2d2d]">
                              {formatNumber(sizeCounts[size])}
                            </p>
                          </article>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="order-1 flex flex-col h-full border-b border-[#e6d8c9] bg-[#fffaf5] px-7 py-8 sm:px-8 xl:order-2 xl:border-b-0 xl:border-l xl:border-t-0">
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className="w-full max-w-[220px]">
                  <div className="text-left">
                    <h2 className="text-[32px] font-semibold tracking-[-0.05em] text-[#151515]">
                      {profile?.nickname ?? "-"}
                    </h2>
                    <p className="mt-2 text-[15px] font-medium text-[#6c5a4d]">
                      @{profile?.username ?? "-"}
                    </p>
                  </div>

                  <div className="mt-10 text-left">
                    <p className="text-sm font-semibold text-[#d8b18f]">
                      {t("mypage.profile.createdAt")}
                    </p>
                    <p className="mt-2 text-[20px] font-medium tracking-[-0.04em] text-[#2d2d2d]">
                      {profile ? formatDate(profile.createdAt, locale) : "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#e6d8c9] pt-6">
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleOpenChangePasswordModal}
                    className="inline-flex h-[52px] items-center justify-center rounded-[20px] border border-[#cfc3b7] bg-white px-4 text-[15px] font-semibold text-[#2d2d2d] transition hover:bg-[#f6eee7]"
                  >
                    {t("mypage.account.changePassword")}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenWithdrawModal}
                    className="inline-flex h-[52px] items-center justify-center rounded-[20px] border border-[#cfc3b7] bg-white px-4 text-[15px] font-semibold text-[#2d2d2d] transition hover:bg-[#f6eee7]"
                  >
                    {t("mypage.account.withdraw")}
                  </button>
                </div>
              </div>
            </aside>
          </div>

          <section className="overflow-hidden rounded-[36px] border border-[#ead7c8] bg-[#fff7f0] shadow-[0_24px_80px_rgba(39,46,55,0.08)]">
            <div className="px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2 rounded-full bg-[#f6ece3] p-1.5">
                  {SIZE_FILTERS.map((filterValue) => (
                    <button
                      key={filterValue}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onClick={() => {
                        pendingFilterScrollYRef.current = window.scrollY;
                        setPage(1);
                        setSizeFilter(filterValue);
                      }}
                      className={[
                        "rounded-full px-4 py-2.5 text-sm font-semibold transition",
                        sizeFilter === filterValue
                          ? "bg-[#2d2d2d] text-white"
                          : "text-[#7a685b] hover:bg-white hover:text-[#2d2d2d]",
                      ].join(" ")}
                    >
                      {filterValue === "all" ? t("mypage.filter.all") : filterValue}
                    </button>
                  ))}
                </div>

                <label className="inline-flex self-start rounded-full border border-[#e1d3c4] bg-white px-4 py-2.5 lg:self-auto">
                  <select
                    value={visibilityFilter}
                    onChange={(event) => {
                      pendingFilterScrollYRef.current = window.scrollY;
                      setPage(1);
                      setVisibilityFilter(event.target.value as VisibilityFilterValue);
                    }}
                    className="bg-transparent pr-6 text-sm font-semibold text-[#2d2d2d] outline-none"
                  >
                    {VISIBILITY_FILTERS.map((filterValue) => (
                      <option key={filterValue} value={filterValue}>
                        {t(`mypage.visibility.${filterValue}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="px-6 pb-6 sm:px-8 sm:pb-8">
              <section className="mt-6 space-y-6">
                {participationsError ? (
                  <p className="text-sm font-medium text-[#c04f2c]">
                    {participationsError}
                  </p>
                ) : null}

                {participationsLoading ? (
                  <p className="text-sm font-medium text-[#7a685b]">
                    {t("common.loading")}
                  </p>
                ) : participations.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-[#d9c7b7] bg-[#fffaf5] px-6 py-12 text-center text-sm font-medium text-[#8a796c]">
                    {t("mypage.participations.empty")}
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {participations.map((item) => (
                      <ParticipationCard
                        key={`${item.canvasId}-${item.participatedAt}`}
                        item={item}
                        locale={locale}
                        onOpenDetail={handleOpenDetail}
                        t={t}
                      />
                    ))}
                  </div>
                )}

                {participations.length > 0 && pagination.totalPages > 1 ? (
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

              </section>
            </div>
          </section>
        </section>
      </main>

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
          <MypageResultModal
            open={detailOpen}
            detail={detail}
            onClose={() => {
              setDetailOpen(false);
              setDetail(null);
              setDetailError(null);
            }}
          />
        )
      ) : null}

      {changePasswordModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,25,20,0.52)] px-4 py-6">
          <div className="w-full max-w-xl rounded-[28px] border border-[#ead7c8] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(39,46,55,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#2d2d2d]">
                  {t("mypage.account.passwordTitle")}
                </h2>
                <p className="mt-2 text-sm text-[#7a685b]">
                  {t("mypage.account.passwordDescription")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseChangePasswordModal}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#eadfce] bg-white px-4 text-sm font-semibold text-[#7a685b] transition hover:bg-[#f4ebe2] hover:text-[#2d2d2d]"
              >
                {t("button.close")}
              </button>
            </div>

            <form className="mt-6" onSubmit={handleChangePassword}>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#6c5a4d]">
                    {t("mypage.account.currentPassword")}
                  </span>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={handlePasswordInputChange(setCurrentPassword)}
                      className="h-12 w-full rounded-2xl border border-[#d9c7b7] bg-[#fffaf5] px-4 pr-12 text-sm text-[#2d2d2d] outline-none transition focus:border-[#d96d43]"
                      autoComplete="current-password"
                    />
                    <PasswordVisibilityButton
                      visible={showCurrentPassword}
                      onClick={() => setShowCurrentPassword((current) => !current)}
                      label={t("mypage.account.togglePasswordVisibility")}
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#6c5a4d]">
                    {t("mypage.account.newPassword")}
                  </span>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={handlePasswordInputChange(setNewPassword)}
                      className="h-12 w-full rounded-2xl border border-[#d9c7b7] bg-[#fffaf5] px-4 pr-12 text-sm text-[#2d2d2d] outline-none transition focus:border-[#d96d43]"
                      autoComplete="new-password"
                    />
                    <PasswordVisibilityButton
                      visible={showNewPassword}
                      onClick={() => setShowNewPassword((current) => !current)}
                      label={t("mypage.account.togglePasswordVisibility")}
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#6c5a4d]">
                    {t("mypage.account.newPasswordConfirm")}
                  </span>
                  <div className="relative">
                    <input
                      type={showNewPasswordConfirm ? "text" : "password"}
                      value={newPasswordConfirm}
                      onChange={handlePasswordInputChange(setNewPasswordConfirm)}
                      className="h-12 w-full rounded-2xl border border-[#d9c7b7] bg-[#fffaf5] px-4 pr-12 text-sm text-[#2d2d2d] outline-none transition focus:border-[#d96d43]"
                      autoComplete="new-password"
                    />
                    <PasswordVisibilityButton
                      visible={showNewPasswordConfirm}
                      onClick={() => setShowNewPasswordConfirm((current) => !current)}
                      label={t("mypage.account.togglePasswordVisibility")}
                    />
                  </div>
                </label>
              </div>

              {accountError ? (
                <p className="mt-4 text-sm font-medium text-[#c04f2c]">
                  {accountError}
                </p>
              ) : null}
              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseChangePasswordModal}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#d9c7b7] bg-white px-5 text-sm font-semibold text-[#6c5a4d] transition hover:bg-[#f6eee7]"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#2d2d2d] px-5 text-sm font-semibold text-white transition hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:bg-[#b3a79c]"
                >
                  {changePasswordLoading
                    ? t("mypage.account.changingPassword")
                    : t("mypage.account.changePassword")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {withdrawModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,25,20,0.52)] px-4 py-6">
          <div className="w-full max-w-lg rounded-[28px] border border-[#f0d3c5] bg-[#fff6f2] px-6 py-6 shadow-[0_18px_50px_rgba(39,46,55,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#2d2d2d]">
                  {t("mypage.account.withdrawTitle")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#7a685b]">
                  {t("mypage.account.withdrawDescription")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseWithdrawModal}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#eadfce] bg-white px-4 text-sm font-semibold text-[#7a685b] transition hover:bg-[#f4ebe2] hover:text-[#2d2d2d]"
              >
                {t("button.close")}
              </button>
            </div>

            <form className="mt-6" onSubmit={handleWithdraw}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#6c5a4d]">
                  {t("mypage.account.withdrawPassword")}
                </span>
                <div className="relative">
                  <input
                    type={showWithdrawPassword ? "text" : "password"}
                    value={withdrawPassword}
                    onChange={handlePasswordInputChange(setWithdrawPassword)}
                    className="h-12 w-full rounded-2xl border border-[#d9c7b7] bg-white px-4 pr-12 text-sm text-[#2d2d2d] outline-none transition focus:border-[#d96d43]"
                    autoComplete="current-password"
                  />
                  <PasswordVisibilityButton
                    visible={showWithdrawPassword}
                    onClick={() => setShowWithdrawPassword((current) => !current)}
                    label={t("mypage.account.togglePasswordVisibility")}
                  />
                </div>
              </label>

              {withdrawError ? (
                <p className="mt-4 text-sm font-medium text-[#c04f2c]">
                  {withdrawError}
                </p>
              ) : null}

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseWithdrawModal}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#d9c7b7] bg-white px-5 text-sm font-semibold text-[#6c5a4d] transition hover:bg-[#f6eee7]"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#c04f2c] px-5 text-sm font-semibold text-white transition hover:bg-[#aa4221] disabled:cursor-not-allowed disabled:bg-[#d6b4a6]"
                >
                  {withdrawLoading
                    ? t("mypage.account.withdrawing")
                    : t("mypage.account.withdraw")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {changePasswordSuccessOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(36,25,20,0.52)] px-4 py-6">
          <div className="w-full max-w-sm rounded-[28px] border border-[#ead7c8] bg-white px-6 py-6 text-center shadow-[0_18px_50px_rgba(39,46,55,0.08)]">
            <p className="text-base font-semibold text-[#2d2d2d]">
              {t("mypage.account.changePasswordSuccess")}
            </p>
            <button
              type="button"
              onClick={handleCloseChangePasswordSuccess}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#2d2d2d] px-5 text-sm font-semibold text-white transition hover:bg-[#1f1f1f]"
            >
              {t("common.confirm")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
