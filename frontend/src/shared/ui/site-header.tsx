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

function HeaderItem({ item }: { item: SiteHeaderItem }) {
  const className = [
    "rounded-full px-3 py-2 text-sm font-semibold transition",
    item.active
      ? "bg-[#272E37] text-white"
      : "text-[#5f6368] hover:bg-white/80 hover:text-[#272E37]",
  ].join(" ");

  return (
    <Link to={item.to} className={className}>
      {item.label}
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
          "mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-[28px] border px-4 py-3 shadow-[0_18px_60px_rgba(39,46,55,0.08)] backdrop-blur-xl sm:px-5",
          translucent
            ? "border-[#ead7c8] bg-[#f6ede5]/88"
            : "border-[#ead7c8] bg-[#f6ede5]",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/${locale}`}
            className="inline-flex items-center"
            aria-label="VoteDots home"
          >
            <BrandLogo variant="wordmark" className="w-28 sm:w-32" />
          </Link>

          <nav className="hidden items-center gap-1 rounded-full bg-[#f7f2eb] p-1 md:flex">
            {items.map((item) => (
              <HeaderItem key={item.key} item={item} />
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 rounded-full bg-[#f7f2eb] p-1 md:hidden">
            {items.map((item) => (
              <HeaderItem key={item.key} item={item} />
            ))}
          </nav>

          <div className="inline-flex items-center gap-1 rounded-full bg-[#f7f2eb] p-1">
            <Link
              to={targetPath("ko")}
              className={[
                "rounded-full px-3 py-2 text-sm font-semibold transition",
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
                "rounded-full px-3 py-2 text-sm font-semibold transition",
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
