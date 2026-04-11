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
      onWheel={onWheel}
    >
      {overlay && <div className="absolute left-4 top-4 z-10">{overlay}</div>}

      <div
        ref={containerRef}
        tabIndex={0} // 변경: 캔버스 영역 포커스 가능
        className="h-full w-full overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        onMouseDown={() => {
          containerRef.current?.focus(); // 변경: 캔버스 클릭 시 포커스 고정
        }}
        onKeyDown={(event) => {
          if (event.code === "Space") {
            event.preventDefault(); // 변경: 캔버스 포커스 상태에서 스페이스 기본 동작 차단
          }
        }}
      >
        <div
          className="flex min-h-full min-w-full items-center justify-center px-10 py-8"
          style={{
            width: "max-content",
            minWidth: "100%",
            minHeight: "100%",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
