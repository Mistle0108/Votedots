import { useEffect } from "react";
import { useI18n } from "@/shared/i18n";

export type PublicSiteLocale = "ko" | "en";

export function detectPublicSiteLocale(): PublicSiteLocale {
  if (typeof navigator === "undefined") {
    return "en";
  }

  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export function usePublicSiteLocale(locale: PublicSiteLocale) {
  const { setLocale } = useI18n();

  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);
}
