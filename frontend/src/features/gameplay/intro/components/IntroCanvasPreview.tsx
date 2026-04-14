import { useEffect, useMemo, useRef } from "react";
import type { Cell } from "@/features/gameplay/canvas";
import { renderCanvas } from "@/features/gameplay/canvas/model/canvas.render";
import { getGameConfig } from "@/shared/config/game-config";

interface Props {
  cells: Cell[];
  gridX: number;
  gridY: number;
  maxSize?: number;
}

const DEFAULT_PREVIEW_SIZE = 260;

export default function IntroCanvasPreview({
  cells,
  gridX,
  gridY,
  maxSize = DEFAULT_PREVIEW_SIZE,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const previewSize = useMemo(() => {
    const longestSide = Math.max(gridX, gridY, 1);
    const scale = maxSize / longestSide;

    return {
      width: Math.max(1, Math.round(gridX * scale)),
      height: Math.max(1, Math.round(gridY * scale)),
    };
  }, [gridX, gridY, maxSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gridX <= 0 || gridY <= 0) {
      return;
    }

    const cellSize = getGameConfig().board.cellSize;

    canvas.width = gridX * cellSize; // 추가: 실제 게임 보드와 같은 해상도로 렌더
    canvas.height = gridY * cellSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.imageSmoothingEnabled = false;

    renderCanvas({
      ctx,
      canvas,
      cells,
      selectedCell: null, // 추가: INTRO 프리뷰는 선택/투표 상태 없이 전체 캔버스만 표시
      previewColor: null,
      votingCellIds: new Set(),
      topColorMap: new Map(),
      timestamp: 0,
    });
  }, [cells, gridX, gridY]);

  return (
    <div className="w-fit">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <canvas
          ref={canvasRef}
          className="block rounded border border-gray-100 bg-white"
          style={{
            width: `${previewSize.width}px`,
            height: `${previewSize.height}px`,
            imageRendering: "pixelated",
          }}
        />
      </div>
    </div>
  );
}
