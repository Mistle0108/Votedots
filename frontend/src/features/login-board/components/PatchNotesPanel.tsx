import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AccordionGroup from "./AccordionGroup";
import MarkdownContent from "./MarkdownContent";
import {
  getPatchBadgeTone,
  getPatchTypeLabel,
} from "../model/board-posts";
import type { PatchVersionGroup } from "../model/board.types";

interface PatchNotesPanelProps {
  groups: PatchVersionGroup[];
}

function Dot({ tone }: { tone: "blue" | "green" | "red" }) {
  const colorMap = {
    blue: "bg-[color:var(--color-accent-blue)]",
    green: "bg-[color:var(--color-accent-green)]",
    red: "bg-[color:var(--color-accent-red)]",
  } as const;

  return <span className={`h-2.5 w-2.5 rounded-full ${colorMap[tone]}`} />;
}

function getBadgeClass(tone: "blue" | "green" | "red") {
  switch (tone) {
    case "blue":
      return "bg-[color:var(--color-badge-blue-bg)] text-[color:var(--color-badge-blue-text)]";
    case "green":
      return "bg-[color:var(--color-badge-green-bg)] text-[color:var(--color-badge-green-text)]";
    case "red":
      return "bg-[color:var(--color-badge-red-bg)] text-[color:var(--color-badge-red-text)]";
  }
}

export default function PatchNotesPanel({ groups }: PatchNotesPanelProps) {
  const [openGroupIds, setOpenGroupIds] = useState<string[]>([]);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const resolvedGroups = useMemo(() => groups, [groups]);

  useEffect(() => {
    setOpenGroupIds(
      groups.filter((group) => group.defaultOpen).map((group) => group.id),
    );
    setOpenItemId(null);
  }, [groups]);

  const toggleGroup = (groupId: string) => {
    setOpenGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  };

  return (
    <div className="thin-scrollbar h-full min-h-0 overflow-y-auto pr-1">
      {resolvedGroups.length === 0 ? (
        <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-dashed border-[color:var(--color-border-primary)] bg-[color:var(--color-background-primary)] px-6 text-center text-sm text-[color:var(--color-text-tertiary)]">
          아직 공개된 패치 내역이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {resolvedGroups.map((group) => {
            const isOpen = openGroupIds.includes(group.id);

            return (
              <AccordionGroup
                key={group.id}
                open={isOpen}
                onToggle={() => toggleGroup(group.id)}
                heading={
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{group.version}</span>
                    {group.badge ? (
                      <span className="rounded-full bg-[color:var(--color-background-tertiary)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]">
                        {group.badge}
                      </span>
                    ) : null}
                  </div>
                }
                meta={group.releaseDate}
              >
                <div className="divide-y divide-[color:var(--color-border-secondary)]">
                  {group.items.map((item) => {
                    const tone = getPatchBadgeTone(item.type);
                    const isExpanded = openItemId === item.id;

                    return (
                      <div key={item.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenItemId((current) =>
                              current === item.id ? null : item.id,
                            )
                          }
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[color:var(--color-background-secondary)]"
                        >
                          <Dot tone={tone} />
                          <span className="min-w-0 flex-1 truncate text-sm text-[color:var(--color-text-primary)]">
                            {item.title}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-[color:var(--color-text-tertiary)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>

                        {isExpanded ? (
                          <div className="space-y-4 border-t-[0.5px] border-[color:var(--color-border-secondary)] bg-[color:var(--color-background-secondary)] px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getBadgeClass(tone)}`}
                              >
                                {getPatchTypeLabel(item.type)}
                              </span>
                              <span className="text-xs text-[color:var(--color-text-tertiary)]">
                                {item.date}
                              </span>
                            </div>

                            <h3 className="m-0 text-base font-semibold text-[color:var(--color-text-primary)]">
                              {item.title}
                            </h3>

                            <MarkdownContent content={item.content} />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </AccordionGroup>
            );
          })}
        </div>
      )}
    </div>
  );
}
