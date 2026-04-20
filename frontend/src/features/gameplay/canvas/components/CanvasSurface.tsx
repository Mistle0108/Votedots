import type { RefObject } from "react";
import { getGameConfig } from "@/shared/config/game-config";

interface CanvasSurfaceProps {
  paintCanvasRef: RefObject<HTMLCanvasElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  backgroundImageUrl: string | null;
  gridX: number;
  gridY: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
}

export default function CanvasSurface({
  paintCanvasRef,
  canvasRef,
  backgroundImageUrl,
  gridX,
  gridY,
  cameraX,
  cameraY,
  zoom,
}: CanvasSurfaceProps) {
  const cellSize = getGameConfig().board.cellSize;
  const backgroundWidth = gridX * cellSize * zoom;
  const backgroundHeight = gridY * cellSize * zoom;
  const backgroundTranslateX = -cameraX * zoom;
  const backgroundTranslateY = -cameraY * zoom;

  return (
    <div className="relative h-full w-full overflow-hidden border border-gray-300">
      {backgroundImageUrl && gridX > 0 && gridY > 0 && (
        <img
          src={backgroundImageUrl}
          alt="캔버스 배경"
          className="pointer-events-none absolute left-0 top-0 z-0 max-w-none select-none"
          style={{
            width: `${backgroundWidth}px`,
            height: `${backgroundHeight}px`,
            transform: `translate(${backgroundTranslateX}px, ${backgroundTranslateY}px)`,
            transformOrigin: "top left",
            imageRendering: "pixelated",
          }}
          draggable={false}
        />
      )}
      <canvas
        ref={paintCanvasRef}
        className="pointer-events-none absolute inset-0 z-[1] block h-full w-full bg-transparent"
      />

      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[2] block h-full w-full bg-transparent"
      />
    </div>
  );
}
