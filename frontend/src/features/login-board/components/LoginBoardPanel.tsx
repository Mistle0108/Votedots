import { useEffect, useState } from "react";
import { loginBoardApi } from "../api/login-board.api";
import { useI18n } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import type { LoginBoardPayload, LoginBoardTab } from "../model/board.types";
import PatchNotesPanel from "./PatchNotesPanel";
import RoadmapPanel from "./RoadmapPanel";

export default function LoginBoardPanel() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<LoginBoardTab>("patches");
  const [boardData, setBoardData] = useState<LoginBoardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadBoard = async () => {
      setLoading(true);
      setError("");

      try {
        const { data } = await loginBoardApi.getBoard();

        if (cancelled) {
          return;
        }

        setBoardData(data);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error("[login-board] failed to fetch board data:", err);
        setError(t("loginBoard.loadError"));
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
  }, [t]);

  return (
    <div className="flex h-full min-h-screen flex-col px-5 py-6 text-left lg:px-7 lg:py-8">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-[color:var(--color-text-tertiary)]">
            {t("loginBoard.subtitle")}
          </p>
          <h1 className="m-0 text-[2rem] font-semibold tracking-tight text-[color:var(--color-text-primary)]">
            {t("loginBoard.title")}
          </h1>
        </div>

        <div className="inline-flex w-fit items-center gap-1 rounded-lg border-[0.5px] border-[color:var(--color-border-primary)] bg-[color:var(--color-background-secondary)] p-1">
          <Button
            type="button"
            variant={activeTab === "patches" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-md px-3 text-[13px]"
            onClick={() => setActiveTab("patches")}
          >
            {t("loginBoard.tab.patches")}
          </Button>
          <Button
            type="button"
            variant={activeTab === "roadmap" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-md px-3 text-[13px]"
            onClick={() => setActiveTab("roadmap")}
          >
            {t("loginBoard.tab.roadmap")}
          </Button>
        </div>
      </div>

      <div className="mt-5 flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-lg border-[0.5px] border-[color:var(--color-border-primary)] bg-[color:var(--color-background-secondary)] p-3 lg:min-h-[620px]">
        {loading ? (
          <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-[color:var(--color-text-tertiary)]">
            {t("loginBoard.loading")}
          </div>
        ) : error ? (
          <div className="flex h-full min-h-[320px] items-center justify-center px-6 text-center text-sm text-[color:var(--color-accent-red)]">
            {error}
          </div>
        ) : activeTab === "patches" ? (
          <PatchNotesPanel groups={boardData?.patches ?? []} />
        ) : (
          <RoadmapPanel groups={boardData?.roadmap ?? []} />
        )}
      </div>
    </div>
  );
}
