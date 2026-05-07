import { Fragment, type Ref } from "react";

import { getGameConfig } from "@/shared/config/game-config";
interface SelectionLabel {
  key: string;
  nickname: string;
  x: number;
  y: number;
  stackIndex: number;
}

interface CanvasSurfaceProps {
  paintCanvasRef: Ref<HTMLCanvasElement>;
  canvasRef: Ref<HTMLCanvasElement>;
  playBackgroundImageUrl: string | null;
  resultTemplateImageUrl: string | null;
  gridX: number;
  gridY: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  worldOffset: {
    x: number;
    y: number;
  };
  surfaceSize: {
    width: number;
    height: number;
  };
  selectionLabels: SelectionLabel[];
  pulsingCellKeys?: ReadonlySet<string>;
}

export default function CanvasSurface({
  paintCanvasRef,
  canvasRef,
  playBackgroundImageUrl,
  resultTemplateImageUrl,
  gridX,
  gridY,
  cameraX,
  cameraY,
  zoom,
  worldOffset,
  surfaceSize,
  selectionLabels,
  pulsingCellKeys,
}: CanvasSurfaceProps) {
  const cellSize = getGameConfig().board.cellSize;
  const backgroundWidth = gridX * cellSize * zoom;
  const backgroundHeight = gridY * cellSize * zoom;
  const backgroundTranslateX = worldOffset.x - cameraX * zoom;
  const backgroundTranslateY = worldOffset.y - cameraY * zoom;
  const renderedCellSize = cellSize * zoom;
  const surfaceWidth = surfaceSize.width;
  const surfaceHeight = surfaceSize.height;

  return (
    <div className="relative h-full w-full overflow-hidden border border-[color:var(--page-theme-border-primary)]">
      {playBackgroundImageUrl && gridX > 0 && gridY > 0 && (
        <img
          src={playBackgroundImageUrl}
          alt="Canvas play background"
          className="pointer-events-none absolute left-0 top-0 z-0 max-w-none select-none"
          style={{
            width: `${backgroundWidth}px`,
            height: `${backgroundHeight}px`,
            transform: `translate(${backgroundTranslateX}px, ${backgroundTranslateY}px)`,
            transformOrigin: "top left",
            imageRendering: "pixelated",
          }}
          draggable={false}
          onDragStart={(event) => {
            event.preventDefault();
          }}
        />
      )}
      {resultTemplateImageUrl && gridX > 0 && gridY > 0 && (
        <img
          src={resultTemplateImageUrl}
          alt="Canvas result template"
          className="pointer-events-none absolute left-0 top-0 z-[1] max-w-none select-none"
          style={{
            width: `${backgroundWidth}px`,
            height: `${backgroundHeight}px`,
            transform: `translate(${backgroundTranslateX}px, ${backgroundTranslateY}px)`,
            transformOrigin: "top left",
            imageRendering: "pixelated",
          }}
          draggable={false}
          onDragStart={(event) => {
            event.preventDefault();
          }}
        />
      )}
      <canvas
        ref={paintCanvasRef}
        className="pointer-events-none absolute inset-0 z-[2] block h-full w-full bg-transparent"
      />

      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[3] block h-full w-full bg-transparent"
      />

      {selectionLabels.map((label) => {
        const cellKey = `${label.x}:${label.y}`;
        const left = backgroundTranslateX + label.x * renderedCellSize;
        const top = backgroundTranslateY + label.y * renderedCellSize;

        if (
          left + renderedCellSize <= 0 ||
          left >= surfaceWidth ||
          top + renderedCellSize <= 0 ||
          top >= surfaceHeight
        ) {
          return null;
        }

        const labelOffset = Math.max(8, Math.min(16, renderedCellSize * 0.35));
        const labelHeight = 26;
        const stackOffset = label.stackIndex * (labelHeight + 6);
        const placeLeft =
          left + renderedCellSize + labelOffset + 160 > surfaceWidth;
        const placeAbove = top - labelOffset - labelHeight - stackOffset >= 0;
        const boxInset = Math.max(1, Math.min(2, renderedCellSize * 0.1));
        const boxSize = Math.max(0, renderedCellSize - boxInset * 2);
        const isPulsing = pulsingCellKeys?.has(cellKey) ?? false;

        return (
          <Fragment key={label.key}>
            <div
              className={`pointer-events-none absolute z-[4] rounded-[2px] border-2 border-dashed border-[#2563EB] shadow-[0_0_0_1px_rgba(255,255,255,0.9)] ${isPulsing ? "animate-pulse bg-[rgba(37,99,235,0.18)]" : ""}`}
              style={{
                left: left + boxInset,
                top: top + boxInset,
                width: boxSize,
                height: boxSize,
              }}
            />
            <div
              className="pointer-events-none absolute z-[5] max-w-40 rounded-sm border border-black bg-white px-2 py-1 text-xs font-semibold leading-none text-black shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
              style={{
                left: placeLeft ? left - labelOffset : left + renderedCellSize + labelOffset,
                top: placeAbove
                  ? top - labelHeight - labelOffset - stackOffset
                  : top + renderedCellSize + labelOffset + stackOffset,
                transform: placeLeft ? "translateX(-100%)" : undefined,
              }}
              title={label.nickname}
            >
              <span className="block truncate">{label.nickname}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
