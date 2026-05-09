import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetIds: string[];
  padding?: number;
  scrollTargetIntoView?: boolean;
}

interface TutorialOverlayProps {
  open: boolean;
  steps: TutorialStep[];
  currentStepIndex: number;
  onStepChange: (nextIndex: number) => void;
  onClose: () => void;
  previousLabel: string;
  nextLabel: string;
  finishLabel: string;
  closeLabel: string;
}

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ScrollPosition = {
  element: HTMLElement;
  top: number;
  left: number;
};

const OVERLAY_COLOR = "rgba(15,23,42,0.52)";

function buildOverlayPath(rect: Rect, radius = 28): string {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const clampedRadius = Math.max(
    0,
    Math.min(radius, rect.width / 2, rect.height / 2),
  );
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;

  return [
    `M0 0H${viewportWidth}V${viewportHeight}H0Z`,
    `M${rect.left + clampedRadius} ${rect.top}`,
    `H${right - clampedRadius}`,
    `A${clampedRadius} ${clampedRadius} 0 0 1 ${right} ${rect.top + clampedRadius}`,
    `V${bottom - clampedRadius}`,
    `A${clampedRadius} ${clampedRadius} 0 0 1 ${right - clampedRadius} ${bottom}`,
    `H${rect.left + clampedRadius}`,
    `A${clampedRadius} ${clampedRadius} 0 0 1 ${rect.left} ${bottom - clampedRadius}`,
    `V${rect.top + clampedRadius}`,
    `A${clampedRadius} ${clampedRadius} 0 0 1 ${rect.left + clampedRadius} ${rect.top}`,
    "Z",
  ].join(" ");
}

function getScrollableAncestors(element: HTMLElement): HTMLElement[] {
  const ancestors: HTMLElement[] = [];
  let current: HTMLElement | null = element.parentElement;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflow = style.overflow;
    const canScroll =
      /(auto|scroll|overlay)/.test(overflowY) ||
      /(auto|scroll|overlay)/.test(overflow);

    if (canScroll && current.scrollHeight > current.clientHeight) {
      ancestors.push(current);
    }

    current = current.parentElement;
  }

  return ancestors;
}

function buildTargetRect(targetIds: string[], padding = 10): Rect | null {
  const rects = targetIds
    .map((targetId) =>
      document
        .querySelector<HTMLElement>(`[data-tutorial-id="${targetId}"]`)
        ?.getBoundingClientRect(),
    )
    .filter((rect): rect is DOMRect => Boolean(rect));

  if (rects.length === 0) {
    return null;
  }

  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  const clampedLeft = Math.max(8, left - padding);
  const clampedTop = Math.max(8, top - padding);
  const clampedRight = Math.min(window.innerWidth - 8, right + padding);
  const clampedBottom = Math.min(window.innerHeight - 8, bottom + padding);

  return {
    left: clampedLeft,
    top: clampedTop,
    width: Math.max(0, clampedRight - clampedLeft),
    height: Math.max(0, clampedBottom - clampedTop),
  };
}

export default function TutorialOverlay({
  open,
  steps,
  currentStepIndex,
  onStepChange,
  onClose,
  previousLabel,
  nextLabel,
  finishLabel,
  closeLabel,
}: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const savedScrollPositionsRef = useRef<ScrollPosition[]>([]);
  const previousStepRef = useRef<TutorialStep | null>(null);
  const currentStep = steps[currentStepIndex] ?? null;
  const isLastStep = currentStepIndex >= steps.length - 1;
  const descriptionLines = useMemo(
    () =>
      currentStep?.description
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean) ?? [],
    [currentStep],
  );

  useLayoutEffect(() => {
    if (!open || !currentStep) {
      return;
    }

    const updateRect = () => {
      setTargetRect(buildTargetRect(currentStep.targetIds, currentStep.padding));
    };

    const frameIds: number[] = [];
    const scheduleStabilizedUpdates = () => {
      let remainingFrames = 4;

      const tick = () => {
        updateRect();
        remainingFrames -= 1;

        if (remainingFrames > 0) {
          frameIds.push(window.requestAnimationFrame(tick));
        }
      };

      frameIds.push(window.requestAnimationFrame(tick));
    };

    scheduleStabilizedUpdates();
    const handleViewportChange = () => {
      updateRect();
    };
    const resizeObserver = new ResizeObserver(() => {
      updateRect();
    });

    currentStep.targetIds.forEach((targetId) => {
      const element = document.querySelector<HTMLElement>(
        `[data-tutorial-id="${targetId}"]`,
      );

      if (element) {
        resizeObserver.observe(element);
      }
    });

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [currentStep, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowRight" && !isLastStep) {
        event.preventDefault();
        onStepChange(currentStepIndex + 1);
        return;
      }

      if (event.key === "ArrowLeft" && currentStepIndex > 0) {
        event.preventDefault();
        onStepChange(currentStepIndex - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentStepIndex, isLastStep, onClose, onStepChange, open]);

  useEffect(() => {
    const restoreScrollPositions = () => {
      for (const position of savedScrollPositionsRef.current) {
        position.element.scrollTop = position.top;
        position.element.scrollLeft = position.left;
      }

      savedScrollPositionsRef.current = [];
    };

    if (!open) {
      restoreScrollPositions();
      previousStepRef.current = null;
      return;
    }

    const previousStep = previousStepRef.current;

    if (
      previousStep?.scrollTargetIntoView &&
      previousStep.id !== currentStep?.id
    ) {
      restoreScrollPositions();
    }

    previousStepRef.current = currentStep;
  }, [currentStep, open]);

  useEffect(() => {
    if (!open || !currentStep || !currentStep.scrollTargetIntoView) {
      return;
    }

    const firstTarget = currentStep.targetIds
      .map((targetId) =>
        document.querySelector<HTMLElement>(`[data-tutorial-id="${targetId}"]`),
      )
      .find(Boolean);

    if (!firstTarget) {
      return;
    }

    savedScrollPositionsRef.current = getScrollableAncestors(firstTarget).map(
      (element) => ({
        element,
        top: element.scrollTop,
        left: element.scrollLeft,
      }),
    );

    const frameId = window.requestAnimationFrame(() => {
      firstTarget.scrollIntoView({
        block: "center",
        inline: "center",
        behavior: "smooth",
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [currentStep, open]);

  if (!open || !currentStep) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80]"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {targetRect ? (
        <>
          <svg className="pointer-events-none fixed inset-0 h-full w-full">
            <path
              d={buildOverlayPath(targetRect)}
              fill={OVERLAY_COLOR}
              fillRule="evenodd"
            />
          </svg>
          <div
            className="pointer-events-none fixed rounded-[28px] border-2 border-[#FACC15]"
            style={{
              left: `${targetRect.left}px`,
              top: `${targetRect.top}px`,
              width: `${targetRect.width}px`,
              height: `${targetRect.height}px`,
            }}
          />
        </>
      ) : null}

      <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4">
        <section className="pointer-events-auto w-full max-w-[440px] rounded-[28px] border border-[rgba(255,255,255,0.12)] bg-[#111827] px-5 py-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.36)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FACC15]">
              {currentStepIndex + 1} / {steps.length}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {closeLabel}
            </button>
          </div>

          <h2
            className="mt-3 text-xl font-semibold leading-tight"
            style={{ color: "#ffffff" }}
          >
            {currentStep.title}
          </h2>

          <div className="mt-3 space-y-2 text-sm leading-6 text-white/85">
            {descriptionLines.map((line, index) => (
              <p key={`${currentStep.id}-${index}`}>{line}</p>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {previousLabel}
            </button>

            <button
              type="button"
              onClick={() => {
                if (isLastStep) {
                  onClose();
                  return;
                }

                onStepChange(currentStepIndex + 1);
              }}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#FACC15] px-5 text-sm font-semibold text-black transition hover:bg-[#f4c60c]"
            >
              {isLastStep ? finishLabel : nextLabel}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
