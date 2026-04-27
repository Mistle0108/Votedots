import type { PageTheme } from "@/shared/theme/tokens/page-theme.types";
import { buildPageThemeStyle } from "@/shared/theme/utils/build-page-theme-style";

export const PLAY_THEME: PageTheme = {
  colorScheme: "light",
  textPrimary: "#272E37",
  textSecondary: "#5E6A75",
  textTertiary: "#8D98A2",
  pageBackground: "#F8F2EA",
  pagePatternDot: "rgba(221, 195, 164, 0.42)",
  panelBackground: "#FEFBF7",
  surfacePrimary: "#FEFBF7",
  surfaceElevated: "rgba(254, 251, 247, 0.96)",
  surfaceSecondary: "#F8F1E7",
  borderPrimary: "#E7DCCF",
  borderSecondary: "#EFE4D7",
  primaryAction: "#5A8393",
  primaryActionHover: "#4B7382",
  primaryActionText: "#FEFBF7",
  accentWarm: "#D9A274",
  accentWarmSoft: "#FAF0E3",
  alert: "#E16057",
  alertSoft: "#F6E2DD",
  overlay: "rgba(39, 46, 55, 0.16)",
};

export const PLAY_THEME_STYLE = buildPageThemeStyle(PLAY_THEME);
