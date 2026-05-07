import { useEffect, useMemo, useState } from "react";
import {
  loginBoardApi,
  PatchNotesPanel,
  RoadmapPanel,
  type LoginBoardPayload,
  type LoginBoardTab,
} from "@/features/login-board";
import { LOGIN_BOARD_THEME_STYLE } from "@/features/login-board/model/board-theme";
import { getSiteContent } from "@/shared/content/site-content";
import {
  type PublicSiteLocale,
  usePublicSiteLocale,
} from "@/shared/hooks/use-public-site-locale";
import { usePageRootClass } from "@/shared/hooks/use-page-root-class";
import { SiteHeader } from "@/shared/ui/site-header";

interface PublicUpdatesPageProps {
  locale: PublicSiteLocale;
  tab: LoginBoardTab;
}

export default function PublicUpdatesPage({
  locale,
  tab,
}: PublicUpdatesPageProps) {
  const content = useMemo(() => getSiteContent(locale), [locale]);
  const [boardData, setBoardData] = useState<LoginBoardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  usePageRootClass("page-shell-root");
  usePublicSiteLocale(locale);

  useEffect(() => {
    let cancelled = false;

    const loadBoard = async () => {
      setLoading(true);
      setError("");

      try {
        const { data } = await loginBoardApi.getBoard();

        if (!cancelled) {
          setBoardData(data);
        }
      } catch {
        if (!cancelled) {
          setError(content.updates.loadError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadBoard();

    return () => {
      cancelled = true;
    };
  }, [content.updates.loadError]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(222,85,72,0.14),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(61,214,140,0.12),transparent_28%),linear-gradient(180deg,#fbf3ec_0%,#fff8f2_44%,#f6f1ea_100%)] text-[#272E37]">
      <SiteHeader
        locale={locale}
        pathSuffix={tab === "patches" ? "/patches" : "/roadmap"}
        items={[
          {
            key: "patches",
            label: content.nav.patchNotes,
            active: tab === "patches",
            to: `/${locale}/patches`,
          },
          {
            key: "roadmap",
            label: content.nav.roadmap,
            active: tab === "roadmap",
            to: `/${locale}/roadmap`,
          },
        ]}
      />

      <main className="px-4 pb-20 pt-6 sm:px-6 lg:px-10">
        <section
          className="mx-auto h-[760px] max-w-7xl rounded-[34px] bg-[#f6ede5]/88 p-4 shadow-[0_28px_90px_rgba(39,46,55,0.08)] backdrop-blur"
          style={LOGIN_BOARD_THEME_STYLE}
        >
          <div className="h-full rounded-[28px] border border-[#ead7c8] bg-white p-4">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                {content.updates.loading}
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center text-sm text-rose-600">
                {error}
              </div>
            ) : tab === "patches" ? (
              <PatchNotesPanel groups={boardData?.patches ?? []} />
            ) : (
              <RoadmapPanel groups={boardData?.roadmap ?? []} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
