import type { RefObject } from "react";

interface CanvasSurfaceProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export default function CanvasSurface({ canvasRef }: CanvasSurfaceProps) {
  return <canvas ref={canvasRef} className="border border-gray-300" />;
}
