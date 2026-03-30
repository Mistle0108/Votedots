import {
  CELL_SIZE,
  CHECKER_DARK,
  CHECKER_LIGHT,
  SELECTED_STROKE_COLOR,
  VOTING_STROKE_COLOR,
} from "./canvas.constants";
import { Cell } from "./canvas.types";

interface RenderCanvasParams {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  cells: Cell[];
  selectedCell: Cell | null;
  previewColor: string | null;
  votingCellIds: Set<number>;
  topColorMap: Map<number, string>;
  timestamp: number;
}

export function renderCanvas({
  ctx,
  canvas,
  cells,
  selectedCell,
  previewColor,
  votingCellIds,
  topColorMap,
  timestamp,
}: RenderCanvasParams) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const alpha = (Math.sin((timestamp / 500) * Math.PI) + 1) / 2;
  const dashOffset = -(timestamp / 100) % 8;

  cells.forEach((cell) => {
    const x = cell.x * CELL_SIZE;
    const y = cell.y * CELL_SIZE;
    const isSelected = selectedCell?.id === cell.id;
    const isVoting = votingCellIds.has(cell.id);
    const topColor = topColorMap.get(cell.id);

    if (cell.color) {
      ctx.fillStyle = cell.color;
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    } else {
      const half = CELL_SIZE / 2;

      ctx.fillStyle = CHECKER_LIGHT;
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

      ctx.fillStyle = CHECKER_DARK;
      ctx.fillRect(x, y, half, half);
      ctx.fillRect(x + half, y + half, half, half);
    }

    if (isSelected && previewColor) {
      ctx.fillStyle = previewColor;
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    } else if (isVoting && topColor && !isSelected) {
      ctx.fillStyle = topColor;
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      ctx.globalAlpha = 1;
    }

    if (isSelected) {
      ctx.strokeStyle = SELECTED_STROKE_COLOR;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }

    if (isVoting && !isSelected) {
      ctx.save();
      ctx.strokeStyle = VOTING_STROKE_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = dashOffset;
      ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      ctx.setLineDash([]);
      ctx.restore();
    }
  });
}
