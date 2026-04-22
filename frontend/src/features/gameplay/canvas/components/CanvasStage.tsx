import type { ReactNode, RefObject } from "react";
import { CANVAS_BACKGROUND_COLOR } from "../model/canvas.constants";

interface CanvasStageProps {
  containerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  overlay?: ReactNode;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onWheel: (event: React.WheelEvent) => void;
}

export default function CanvasStage({
  containerRef,
  children,
  overlay,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onWheel,
}: CanvasStageProps) {
  return (
    <div
      className="relative min-w-0 flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
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
      onWheel={(event) => {
        console.log("[canvas-stage:wheel]", {
          deltaY: event.deltaY,
          clientX: event.clientX,
          clientY: event.clientY,
          target: event.target,
          currentTarget: event.currentTarget,
        });

        onWheel(event);
      }}
    >
      {overlay && <div className="absolute left-4 top-4 z-10">{overlay}</div>}

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
