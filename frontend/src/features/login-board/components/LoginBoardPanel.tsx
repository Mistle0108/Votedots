import { useState } from "react";
import { Button } from "@/shared/ui/button";
import type { LoginBoardTab } from "../model/board.types";
import PatchNotesPanel from "./PatchNotesPanel";
import RoadmapPanel from "./RoadmapPanel";

export default function LoginBoardPanel() {
  const [activeTab, setActiveTab] = useState<LoginBoardTab>("patches");

  return (
    <div className="flex h-full min-h-screen flex-col px-5 py-6 text-left lg:px-7 lg:py-8">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-[color:var(--color-text-tertiary)]">
            Update board
          </p>
          <h1 className="m-0 text-[2rem] font-semibold tracking-tight text-[color:var(--color-text-primary)]">
            Plan Board
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
            Patch Notes
          </Button>
          <Button
            type="button"
            variant={activeTab === "roadmap" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-md px-3 text-[13px]"
            onClick={() => setActiveTab("roadmap")}
          >
            Roadmaps
          </Button>
        </div>
      </div>

      <div className="mt-5 flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-lg border-[0.5px] border-[color:var(--color-border-primary)] bg-[color:var(--color-background-secondary)] p-3 lg:min-h-[620px]">
        {activeTab === "patches" ? <PatchNotesPanel /> : <RoadmapPanel />}
      </div>
    </div>
  );
}
