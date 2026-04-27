import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AccordionGroup from "./AccordionGroup";
import MarkdownContent from "./MarkdownContent";
import type { RoadmapQuarterGroup } from "../model/board.types";

interface RoadmapPanelProps {
  groups: RoadmapQuarterGroup[];
}

export default function RoadmapPanel({ groups }: RoadmapPanelProps) {
  const [openGroupIds, setOpenGroupIds] = useState<string[]>([]);
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  const sortedGroups = useMemo(() => {
    const getLatestUpdatedAt = (dates: string[]) =>
      [...dates].sort((a, b) => b.localeCompare(a))[0] ?? "";

    return [...groups]
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      }))
      .sort((a, b) => {
        const aLatest = getLatestUpdatedAt(a.items.map((item) => item.updatedAt));
        const bLatest = getLatestUpdatedAt(b.items.map((item) => item.updatedAt));

        return bLatest.localeCompare(aLatest);
      });
  }, [groups]);

  useEffect(() => {
    setOpenGroupIds(
      sortedGroups
        .filter((group) => group.defaultOpen)
        .map((group) => group.id),
    );
    setOpenItemId(null);
  }, [sortedGroups]);

  const toggleGroup = (groupId: string) => {
    setOpenGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  };

  return (
    <div className="thin-scrollbar h-full min-h-0 overflow-y-auto pr-1">
      {sortedGroups.length === 0 ? (
        <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-dashed border-[color:var(--color-border-primary)] bg-[color:var(--color-background-primary)] px-6 text-center text-sm text-[color:var(--color-text-tertiary)]">
          아직 공개된 로드맵이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedGroups.map((group) => {
            const isOpen = openGroupIds.includes(group.id);

            return (
              <AccordionGroup
                key={group.id}
                open={isOpen}
                onToggle={() => toggleGroup(group.id)}
                heading={group.quarter}
                meta={`~ ${group.dueDate}`}
              >
                <div className="divide-y divide-[color:var(--color-border-secondary)]">
                  {group.items.map((item) => {
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
                          className="w-full px-4 py-3 text-left transition hover:bg-[color:var(--color-background-secondary)]"
                        >
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-sm font-medium text-[color:var(--color-text-primary)]">
                                {item.title}
                              </p>
                              <p className="line-clamp-1 text-[13px] text-[color:var(--color-text-tertiary)]">
                                {item.summary}
                              </p>
                            </div>
                            <ChevronDown
                              className={`mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-text-tertiary)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </div>
                        </button>

                        {isExpanded ? (
                          <div className="space-y-4 border-t-[0.5px] border-[color:var(--color-border-secondary)] bg-[color:var(--color-background-secondary)] px-4 py-4">
                            <div className="text-xs text-[color:var(--color-text-tertiary)]">
                              {item.date}
                            </div>

                            <div>
                              <h3 className="m-0 text-base font-semibold text-[color:var(--color-text-primary)]">
                                {item.title}
                              </h3>
                              <p className="mt-1 text-sm leading-6 text-[color:var(--color-text-tertiary)]">
                                {item.summary}
                              </p>
                            </div>

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
