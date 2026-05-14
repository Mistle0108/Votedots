export const CURRENT_TERMS_VERSION = "2026-05-12";
export const WITHDRAWN_VOTER_NICKNAME = "ghost";

export const SUPPORTED_AUTH_LOCALES = ["ko", "en"] as const;

export type AuthLocale = (typeof SUPPORTED_AUTH_LOCALES)[number];
