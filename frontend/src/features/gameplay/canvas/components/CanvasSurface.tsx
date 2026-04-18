import type { RefObject } from "react";

interface CanvasSurfaceProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  backgroundImageUrl: string | null;
}

export default function CanvasSurface({
  canvasRef,
  backgroundImageUrl,
}: CanvasSurfaceProps) {
  return (
    <div className="relative inline-block border border-gray-300">
      {backgroundImageUrl && (
        <img
          src={backgroundImageUrl}
          alt="캔버스 배경"
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          style={{ imageRendering: "pixelated" }}
          draggable={false}
        />
      )}
      <canvas ref={canvasRef} className="relative z-[1] block bg-transparent" />
    </div>
  );
}
