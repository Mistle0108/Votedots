import { X } from "lucide-react";
import type { BoardModalPayload } from "../model/board.types";
import { useI18n } from "@/shared/i18n";
import MarkdownContent from "./MarkdownContent";

interface BoardItemModalProps {
  item: BoardModalPayload | null;
  onClose: () => void;
}

function getBadgeClass(tone: BoardModalPayload["badgeTone"]) {
  switch (tone) {
    case "blue":
      return "bg-[color:var(--color-badge-blue-bg)] text-[color:var(--color-badge-blue-text)]";
    case "green":
      return "bg-[color:var(--color-badge-green-bg)] text-[color:var(--color-badge-green-text)]";
    case "red":
      return "bg-[color:var(--color-badge-red-bg)] text-[color:var(--color-badge-red-text)]";
    default:
      return "bg-[color:var(--color-background-tertiary)] text-[color:var(--color-text-secondary)]";
  }
}

export default function BoardItemModal({
  item,
  onClose,
}: BoardItemModalProps) {
  const { t } = useI18n();

  if (!item) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-overlay)] px-4 py-6"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[min(720px,calc(100vh-48px))] w-full max-w-2xl flex-col overflow-hidden rounded-lg border-[0.5px] border-[color:var(--color-border-primary)] bg-[color:var(--color-background-primary)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b-[0.5px] border-[color:var(--color-border-primary)] px-5 py-4">
          <div className="space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getBadgeClass(item.badgeTone)}`}
              >
                {item.badgeLabel}
              </span>
            </div>
            <h2 className="m-0 text-xl font-semibold text-[color:var(--color-text-primary)]">
              {item.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-[0.5px] border-[color:var(--color-border-primary)] bg-[color:var(--color-background-primary)] text-[color:var(--color-text-secondary)] transition hover:bg-[color:var(--color-background-secondary)] hover:text-[color:var(--color-text-primary)]"
            aria-label={t("common.closeDetails")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <MarkdownContent content={item.content} />
        </div>

        <div className="border-t-[0.5px] border-[color:var(--color-border-primary)] px-5 py-3 text-sm text-[color:var(--color-text-tertiary)]">
          {item.footerText}
        </div>
      </div>
    </div>
  );
}
