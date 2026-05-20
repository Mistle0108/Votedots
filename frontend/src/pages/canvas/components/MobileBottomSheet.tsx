import type { ReactNode } from "react";
import { useSwipeDownDismiss } from "@/shared/hooks/use-swipe-down-dismiss";

interface MobileBottomSheetProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  headerActions?: ReactNode;
  children: ReactNode;
  maxHeightClassName?: string;
  showBackdrop?: boolean;
  headerActionsOffsetClassName?: string;
  tutorialId?: string;
}

export default function MobileBottomSheet({
  open,
  title,
  onClose,
  headerActions,
  children,
  maxHeightClassName = "max-h-[70vh]",
  showBackdrop = true,
  headerActionsOffsetClassName = "",
  tutorialId,
}: MobileBottomSheetProps) {
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  } = useSwipeDownDismiss({
    onDismiss: onClose,
  });

  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      {showBackdrop ? (
        <button
          type="button"
          aria-label="close"
          className="pointer-events-auto absolute inset-0 bg-[rgba(0,0,0,0.28)]"
          onPointerDown={onClose}
          onPointerMove={onClose}
          onTouchStart={onClose}
          onTouchMove={onClose}
          onTouchEnd={onClose}
          onClick={onClose}
        />
      ) : null}

      <div
        className={`pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-page-background)] shadow-[0_-20px_40px_rgba(15,23,42,0.22)] ${maxHeightClassName}`}
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        }}
        data-tutorial-id={tutorialId}
      >
        <div
          className="flex justify-center pt-3"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <span className="h-1.5 w-12 rounded-full bg-[color:var(--page-theme-border-primary)]" />
        </div>

        <div
          className="flex items-center justify-between gap-3 px-5 pb-3 pt-0"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <div className="flex min-w-0 flex-1 self-stretch items-center">
            {title}
          </div>

          <div
            className={`flex shrink-0 items-center gap-2 ${headerActionsOffsetClassName}`}
          >
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--page-theme-border-primary)] bg-[color:var(--page-theme-surface-primary)] text-lg font-medium text-[color:var(--page-theme-text-secondary)]"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          {children}
        </div>
      </div>
    </div>
  );
}
