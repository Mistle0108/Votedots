import { Navigate } from "react-router-dom";
import {
  detectPublicSiteLocale,
  type PublicSiteLocale,
} from "@/shared/hooks/use-public-site-locale";

export default function LocaleRedirectPage() {
  const locale: PublicSiteLocale = detectPublicSiteLocale();

  return <Navigate to={`/${locale}`} replace />;
}
