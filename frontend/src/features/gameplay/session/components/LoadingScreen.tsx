import { useI18n } from "@/shared/i18n";

export default function LoadingScreen() {
  const { t } = useI18n();

  return (
    <div className="flex h-full w-full items-center justify-center text-[color:var(--page-theme-text-secondary)]">
      {t("common.loading")}
    </div>
  );
}
