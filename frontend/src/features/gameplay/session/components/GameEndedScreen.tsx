import { useI18n } from "@/shared/i18n";
import { BrandLogo } from "@/shared/ui/brand-logo";

export default function GameEndedScreen() {
  const { t } = useI18n();

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <BrandLogo variant="full" className="w-56 max-w-full" />
        <p className="text-xl font-bold text-[color:var(--page-theme-primary-action)]">
          {t("session.gameEnded")}
        </p>
      </div>
    </div>
  );
}
