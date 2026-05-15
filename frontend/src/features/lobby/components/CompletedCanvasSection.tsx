import FeaturedPreviewCard from "@/features/landing/components/FeaturedPreviewCard";
import type { LandingFeaturedPreviewItem } from "@/features/landing/model/landing.types";
import {
  detectPublicSiteLocale,
  type PublicSiteLocale,
} from "@/shared/hooks/use-public-site-locale";
import { useI18n } from "@/shared/i18n";

interface CompletedCanvasSectionProps {
  scope: "plaza" | "public";
  preset: "today" | "7d" | "30d";
  items: LandingFeaturedPreviewItem[];
  loading: boolean;
  error: string | null;
  onChangeScope: (scope: "plaza" | "public") => void;
  onChangePreset: (preset: "today" | "7d" | "30d") => void;
}

const locale: PublicSiteLocale = detectPublicSiteLocale();

const COMPLETED_PREVIEW_SLOTS = [
  { gridX: 32, gridY: 32, size: "32x32" },
  { gridX: 64, gridY: 64, size: "64x64" },
  { gridX: 128, gridY: 128, size: "128x128" },
  { gridX: 256, gridY: 256, size: "256x256" },
] as const;

export default function CompletedCanvasSection({
  scope,
  preset,
  items,
  loading,
  error,
  onChangeScope,
  onChangePreset,
}: CompletedCanvasSectionProps) {
  const { t } = useI18n();
  const previewBySize = new Map(
    items.map((item) => [item.preview.size, item] as const),
  );

  return (
    <div className="min-h-[520px] rounded-[28px] bg-[#fbf7f2] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">
            {t("lobby.completed.title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#5f6368]">
            {t("lobby.completed.description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-full border border-[#d9cdc1] bg-white p-1">
            <button
              type="button"
              onClick={() => onChangeScope("plaza")}
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
              onClick={() => onChangeScope("public")}
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
                onClick={() => onChangePreset(value)}
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
        </div>
      </div>

      {loading ? (
        <div className="mt-8 text-sm text-[#5f6368]">{t("common.loading")}</div>
      ) : error ? (
        <div className="mt-8 text-sm text-[#d14d28]">{error}</div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-[24px] border border-dashed border-[#d9cdc1] bg-white px-6 py-10 text-sm text-[#5f6368]">
          {t("lobby.completed.empty")}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {COMPLETED_PREVIEW_SLOTS.map((slot) => (
            <FeaturedPreviewCard
              key={slot.size}
              locale={locale}
              gridX={slot.gridX}
              gridY={slot.gridY}
              item={previewBySize.get(slot.size) ?? null}
              labels={{
                participants: t("lobby.completed.participants"),
                votes: t("lobby.completed.votes"),
                topVoter: t("lobby.completed.topVoter"),
                participantList: t("lobby.completed.participantList"),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
