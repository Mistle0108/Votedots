import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  resources,
  SUPPORTED_LOCALES,
  type Locale,
  type TranslationParams,
} from "./resources";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
  formatNumber: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (
    value: number | string | null | undefined,
    options?: Intl.NumberFormatOptions,
  ) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value === "ko" || value === "en";
}

function resolveBrowserLocale(): Locale {
  if (typeof navigator === "undefined") {
    return DEFAULT_LOCALE;
  }

  const normalized = navigator.language.toLowerCase();

  if (normalized.startsWith("en")) {
    return "en";
  }

  return DEFAULT_LOCALE;
}

function resolveInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);

  if (isSupportedLocale(savedLocale)) {
    return savedLocale;
  }

  return resolveBrowserLocale();
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    if (!SUPPORTED_LOCALES.includes(nextLocale)) {
      return;
    }

    setLocaleState(nextLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      const template =
        resources[locale][key] ??
        resources[DEFAULT_LOCALE][key] ??
        key;

      return interpolate(template, params);
    },
    [locale],
  );

  const formatNumber = useCallback(
    (
      value: number | null | undefined,
      options?: Intl.NumberFormatOptions,
    ) =>
      new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", options).format(
        value ?? 0,
      ),
    [locale],
  );

  const formatPercent = useCallback(
    (
      value: number | string | null | undefined,
      options?: Intl.NumberFormatOptions,
    ) => {
      if (value === null || value === undefined || value === "") {
        return "0%";
      }

      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        return `${value}%`;
      }

      return `${new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
        maximumFractionDigits: 2,
        ...options,
      }).format(numericValue)}%`;
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      formatNumber,
      formatPercent,
    }),
    [formatNumber, formatPercent, locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider.");
  }

  return context;
}
