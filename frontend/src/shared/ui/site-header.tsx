import { Link } from "react-router-dom";
import type { PublicSiteLocale } from "@/shared/hooks/use-public-site-locale";
import { BrandLogo } from "./brand-logo";

interface SiteHeaderItem {
  key: string;
  label: string;
  active?: boolean;
  to: string;
}

interface SiteHeaderProps {
  locale: PublicSiteLocale;
  pathSuffix?: string;
  items: SiteHeaderItem[];
  translucent?: boolean;
}

function getResponsiveLabel(
  item: SiteHeaderItem,
  locale: PublicSiteLocale,
): string {
  if (locale !== "ko") {
    return item.label;
  }

  if (item.key === "patches") {
    return "패치\n노트";
  }

  if (item.key === "roadmap") {
    return "로드\n맵";
  }

  return item.label;
}

function HeaderItem({
  item,
  locale,
}: {
  item: SiteHeaderItem;
  locale: PublicSiteLocale;
}) {
  const className = [
    "rounded-full px-2.5 py-2 text-center text-xs font-semibold leading-[1.05] transition sm:px-3 sm:text-sm sm:leading-normal",
    item.active
      ? "bg-[#272E37] text-white"
      : "text-[#5f6368] hover:bg-white/80 hover:text-[#272E37]",
  ].join(" ");

  return (
    <Link to={item.to} className={className}>
      <span className="block whitespace-pre-line sm:whitespace-nowrap">
        {getResponsiveLabel(item, locale)}
      </span>
    </Link>
  );
}

export function SiteHeader({
  locale,
  pathSuffix = "",
  items,
  translucent = true,
}: SiteHeaderProps) {
  const targetPath = (targetLocale: PublicSiteLocale) =>
    `/${targetLocale}${pathSuffix}`;

  return (
    <header className="px-4 pt-4 sm:px-6 lg:px-10 lg:pt-6">
      <div
        className={[
          "mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-2 rounded-[28px] border px-4 py-3 shadow-[0_18px_60px_rgba(39,46,55,0.08)] backdrop-blur-xl sm:gap-3 sm:px-5",
          translucent
            ? "border-[#ead7c8] bg-[#f6ede5]/88"
            : "border-[#ead7c8] bg-[#f6ede5]",
        ].join(" ")}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link
            to={`/${locale}`}
            className="inline-flex items-center"
            aria-label="VoteDots home"
          >
            <BrandLogo variant="wordmark" className="w-20 sm:w-32" />
          </Link>

          <nav className="flex min-w-0 items-center gap-1 rounded-full bg-[#f7f2eb] p-1">
            {items.map((item) => (
              <HeaderItem key={item.key} item={item} locale={locale} />
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="inline-flex items-center gap-1 rounded-full bg-[#f7f2eb] p-1">
            <Link
              to={targetPath("ko")}
              className={[
                "rounded-full px-2.5 py-2 text-xs font-semibold transition sm:px-3 sm:text-sm",
                locale === "ko"
                  ? "bg-[#272E37] text-white"
                  : "text-[#5f6368] hover:bg-white/80 hover:text-[#272E37]",
              ].join(" ")}
            >
              KO
            </Link>
            <Link
              to={targetPath("en")}
              className={[
                "rounded-full px-2.5 py-2 text-xs font-semibold transition sm:px-3 sm:text-sm",
                locale === "en"
                  ? "bg-[#272E37] text-white"
                  : "text-[#5f6368] hover:bg-white/80 hover:text-[#272E37]",
              ].join(" ")}
            >
              EN
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
