import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { CANVAS_BACKGROUND_COLOR } from "../model/canvas.constants";

interface CanvasStageProps {
  containerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  overlay?: ReactNode;
  topCenterOverlay?: ReactNode;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onMouseLeave: () => void;
  isDragging: boolean;
  onWheel: (event: WheelEvent) => void;
}

export default function CanvasStage({
  containerRef,
  children,
  overlay,
  topCenterOverlay,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  isDragging,
  onWheel,
}: CanvasStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      onWheel(event);
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      stage.removeEventListener("wheel", handleWheel);
    };
  }, [onWheel]);

  return (
    <div
      ref={stageRef}
      className={`relative min-w-0 flex-1 overflow-hidden ${isDragging ? "cursor-grabbing" : ""}`}
      style={{
        backgroundColor: CANVAS_BACKGROUND_COLOR,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onDragStart={(event) => {
        event.preventDefault();
      }}
    >
      {overlay && <div className="absolute left-4 top-4 z-10">{overlay}</div>}
      {topCenterOverlay && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
          {topCenterOverlay}
        </div>
      )}

      <div
        ref={containerRef}
        tabIndex={0}
        className="relative h-full w-full overflow-hidden"
        onMouseDown={() => {
          containerRef.current?.focus();
        }}
        onKeyDown={(event) => {
          if (event.code === "Space") {
            event.preventDefault();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
