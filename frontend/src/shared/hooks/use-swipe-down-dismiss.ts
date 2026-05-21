import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";

interface UseSwipeDownDismissParams {
  onDismiss: () => void;
  threshold?: number;
  closeDurationMs?: number;
  active?: boolean;
}

export function useSwipeDownDismiss({
  onDismiss,
  threshold = 72,
  closeDurationMs = 220,
  active = true,
}: UseSwipeDownDismissParams) {
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const lockedAxisRef = useRef<"vertical" | "horizontal" | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (active) {
      return;
    }

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    startPointRef.current = null;
    lockedAxisRef.current = null;

    const frameId = window.requestAnimationFrame(() => {
      setDragOffsetY(0);
      setIsDragging(false);
      setIsClosing(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [active]);

  const resetGesture = useCallback(() => {
    startPointRef.current = null;
    lockedAxisRef.current = null;
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    if (isClosing) {
      return;
    }

    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    startPointRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    lockedAxisRef.current = null;
    setDragOffsetY(0);
  }, [isClosing]);

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
      setIsDragging(true);
      setDragOffsetY(deltaY);
      event.preventDefault();
      return;
    }

    if (lockedAxisRef.current === "vertical") {
      setDragOffsetY(0);
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
        setDragOffsetY(Math.max(deltaY, threshold));
        setIsClosing(true);

        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current);
        }

        closeTimerRef.current = window.setTimeout(() => {
          closeTimerRef.current = null;
          onDismiss();
        }, closeDurationMs);
      } else {
        setDragOffsetY(0);
      }

      resetGesture();
    },
    [closeDurationMs, onDismiss, resetGesture, threshold],
  );

  const handleTouchCancel = useCallback(() => {
    setDragOffsetY(0);
    resetGesture();
  }, [resetGesture]);

  const backdropOpacity = useMemo(() => {
    if (isClosing) {
      return 0;
    }

    if (dragOffsetY <= 0) {
      return 1;
    }

    return Math.max(0, 1 - dragOffsetY / (threshold * 2));
  }, [dragOffsetY, isClosing, threshold]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    dragOffsetY,
    isDragging,
    isClosing,
    backdropOpacity,
    transitionDurationMs: closeDurationMs,
  };
}
