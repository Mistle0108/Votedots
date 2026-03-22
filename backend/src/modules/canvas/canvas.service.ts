import { AppDataSource } from "../../database/data-source";
import { Canvas, CanvasStatus } from "../../entities/canvas.entity";
import { Cell, CellStatus } from "../../entities/cell.entity";

const canvasRepository = AppDataSource.getRepository(Canvas);
const cellRepository = AppDataSource.getRepository(Cell);

const GRID_X = parseInt(process.env.GRID_SIZE_X ?? "25");
const GRID_Y = parseInt(process.env.GRID_SIZE_Y ?? "25");

export const canvasService = {
  async create(): Promise<Canvas> {
    // 이미 진행 중인 캔버스가 있으면 생성 불가
    const existing = await canvasRepository.findOne({
      where: { status: CanvasStatus.PLAYING },
    });
    if (existing) {
      throw new Error("이미 진행 중인 캔버스가 있어요");
    }

    // 캔버스 생성
    const canvas = canvasRepository.create({
      gridX: GRID_X,
      gridY: GRID_Y,
      status: CanvasStatus.PLAYING,
      startedAt: new Date(),
    });
    await canvasRepository.save(canvas);

    // N×N 셀 일괄 생성
    const cells: Partial<Cell>[] = [];
    for (let y = 0; y < GRID_Y; y++) {
      for (let x = 0; x < GRID_X; x++) {
        cells.push({
          canvas,
          x,
          y,
          color: null,
          status: CellStatus.IDLE,
        });
      }
    }
    await cellRepository.save(cells as Cell[]);

    return canvas;
  },

  async getCurrent(): Promise<Canvas | null> {
    return canvasRepository.findOne({
      where: { status: CanvasStatus.PLAYING },
    });
  },

  async getCells(canvasId: number): Promise<Cell[]> {
    return cellRepository.find({
      where: { canvas: { id: canvasId } },
      order: { y: "ASC", x: "ASC" },
    });
  },
};
