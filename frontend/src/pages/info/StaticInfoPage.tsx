import { useMemo } from "react";
import { getSiteContent, type InfoPageKey } from "@/shared/content/site-content";
import { usePageRootClass } from "@/shared/hooks/use-page-root-class";
import {
  type PublicSiteLocale,
  usePublicSiteLocale,
} from "@/shared/hooks/use-public-site-locale";
import { SiteHeader } from "@/shared/ui/site-header";

interface StaticInfoPageProps {
  pageKey: InfoPageKey;
  locale: PublicSiteLocale;
}

export default function StaticInfoPage({
  pageKey,
  locale,
}: StaticInfoPageProps) {
  const content = useMemo(() => getSiteContent(locale), [locale]);
  const page = content.infoPages[pageKey];

  usePageRootClass("page-shell-root");
  usePublicSiteLocale(locale);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(222,85,72,0.12),transparent_26%),linear-gradient(180deg,#fbf3ec_0%,#ffffff_100%)] text-[#272E37]">
      <SiteHeader
        locale={locale}
        pathSuffix={`/${pageKey}`}
        items={[
          {
            key: "patches",
            label: content.nav.patchNotes,
            to: `/${locale}/patches`,
          },
          {
            key: "roadmap",
            label: content.nav.roadmap,
            to: `/${locale}/roadmap`,
          },
        ]}
        translucent={false}
      />

      <main className="px-4 pb-20 pt-8 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-4xl rounded-[36px] border border-[#ead7c8] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(39,46,55,0.06)] sm:px-8 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d36844]">
            VoteDots
          </p>
          <h1 className="mt-4 text-left text-4xl font-semibold text-[#272E37] sm:text-5xl">
            {page.title}
          </h1>
          <p className="mt-5 max-w-3xl text-left text-base leading-7 text-[#5f6368] sm:text-lg">
            {page.lead}
          </p>

          <div className="mt-10 space-y-6">
            {page.sections.map((section) => (
              <section
                key={section.heading}
                className="rounded-[28px] border border-[#ead7c8] bg-[#fffaf4] px-5 py-5 text-left"
              >
                <h2 className="text-2xl font-semibold text-[#272E37]">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-3 text-base leading-7 text-[#5f6368]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
