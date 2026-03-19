import { Request, Response } from "express";
import { canvasService } from "./canvas.service";

export const canvasController = {
  async create(req: Request, res: Response) {
    try {
      const canvas = await canvasService.create();
      return res.status(201).json({ message: "캔버스가 생성됐어요", canvas });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },

  async getCurrent(req: Request, res: Response) {
    try {
      const canvas = await canvasService.getCurrent();
      if (!canvas) {
        return res.status(404).json({ message: "진행 중인 캔버스가 없어요" });
      }
      const cells = await canvasService.getCells(canvas.id);
      return res.json({ canvas, cells });
    } catch (err) {
      return res.status(500).json({ message: String(err) });
    }
  },
};
