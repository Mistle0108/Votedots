import { useCallback, useRef, type TouchEvent } from "react";

interface UseSwipeDownDismissParams {
  onDismiss: () => void;
  threshold?: number;
}

export function useSwipeDownDismiss({
  onDismiss,
  threshold = 72,
}: UseSwipeDownDismissParams) {
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const lockedAxisRef = useRef<"vertical" | "horizontal" | null>(null);

  const resetGesture = useCallback(() => {
    startPointRef.current = null;
    lockedAxisRef.current = null;
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    startPointRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    lockedAxisRef.current = null;
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent<HTMLElement>) => {
    const startPoint = startPointRef.current;
    const touch = event.touches[0];

    if (!startPoint || !touch) {
      return;
    }

    const deltaX = touch.clientX - startPoint.x;
    const deltaY = touch.clientY - startPoint.y;

    if (!lockedAxisRef.current && Math.abs(deltaX) + Math.abs(deltaY) >= 12) {
      lockedAxisRef.current =
        Math.abs(deltaY) >= Math.abs(deltaX) ? "vertical" : "horizontal";
    }

    if (
      lockedAxisRef.current === "vertical" &&
      deltaY > 0 &&
      Math.abs(deltaY) > Math.abs(deltaX) &&
      event.cancelable
    ) {
      event.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const startPoint = startPointRef.current;
      const touch = event.changedTouches[0];

      if (!startPoint || !touch) {
        resetGesture();
        return;
      }

      const deltaX = touch.clientX - startPoint.x;
      const deltaY = touch.clientY - startPoint.y;

      if (
        lockedAxisRef.current === "vertical" &&
        deltaY >= threshold &&
        deltaY > Math.abs(deltaX)
      ) {
        onDismiss();
      }

      resetGesture();
    },
    [onDismiss, resetGesture, threshold],
  );

  const handleTouchCancel = useCallback(() => {
    resetGesture();
  }, [resetGesture]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  };
}
