import type { ReactNode, RefObject } from "react";
import {
  CANVAS_BACKGROUND_COLOR,
  PANEL_WIDTH,
} from "../model/canvas.constants";

interface CanvasStageProps {
  containerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

export default function CanvasStage({
  containerRef,
  children,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}: CanvasStageProps) {
  return (
    <div
      className="relative overflow-hidden cursor-grab active:cursor-grabbing"
      style={{
        width: `calc(100% - ${PANEL_WIDTH}px)`,
        backgroundColor: CANVAS_BACKGROUND_COLOR,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      <div
        ref={containerRef}
        className="h-full w-full overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="min-h-full min-w-full">{children}</div>
      </div>
    </div>
  );
}
