import { useI18n } from "@/shared/i18n";

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({
  className = "",
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={`z-[70] inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 p-1 shadow-sm backdrop-blur ${className}`.trim()}
    >
      <span className="sr-only">{t("language.switcher")}</span>
      <button
        type="button"
        onClick={() => setLocale("ko")}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
          locale === "ko"
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        aria-pressed={locale === "ko"}
      >
        KO
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
          locale === "en"
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
