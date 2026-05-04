import { createContext } from "react";
import type { Locale, TranslationParams } from "./resources";

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
  formatNumber: (value: number | null | undefined, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (
    value: number | string | null | undefined,
    options?: Intl.NumberFormatOptions,
  ) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
