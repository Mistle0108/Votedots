import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/utils";

interface AccordionGroupProps {
  heading: React.ReactNode;
  meta?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function AccordionGroup({
  heading,
  meta,
  open,
  onToggle,
  children,
}: AccordionGroupProps) {
  return (
    <section className="overflow-hidden rounded-lg border-[0.5px] border-[color:var(--color-border-primary)] bg-[color:var(--color-background-primary)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[color:var(--color-background-secondary)]"
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[color:var(--color-text-primary)]">
            {heading}
          </div>
          {meta ? (
            <div className="mt-1 text-xs text-[color:var(--color-text-tertiary)]">
              {meta}
            </div>
          ) : null}
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[color:var(--color-text-tertiary)] transition-transform",
            open ? "rotate-180" : "",
          )}
        />
      </button>

      {open ? (
        <div className="border-t-[0.5px] border-[color:var(--color-border-primary)]">
          {children}
        </div>
      ) : null}
    </section>
  );
}
