import { Request, Response } from "express";
import { roundService } from "./round.service";

export const roundController = {
  async startRound(req: Request, res: Response) {
    try {
      const canvasId = parseInt(String(req.params["canvasId"]));
      if (isNaN(canvasId)) {
        return res.status(400).json({ message: "올바르지 않은 캔버스 ID예요" });
      }

      const round = await roundService.startRound(canvasId);
      return res.status(201).json({ message: "라운드가 시작됐어요", round });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },

  async endRound(req: Request, res: Response) {
    try {
      const canvasId = parseInt(String(req.params["canvasId"]));
      const roundId = parseInt(String(req.params["roundId"]));
      if (isNaN(canvasId) || isNaN(roundId)) {
        return res.status(400).json({ message: "올바르지 않은 ID예요" });
      }

      const round = await roundService.endRound(canvasId, roundId);
      return res.json({ message: "라운드가 종료됐어요", round });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },

  async getActiveRound(req: Request, res: Response) {
    try {
      const canvasId = parseInt(String(req.params["canvasId"]));
      if (isNaN(canvasId)) {
        return res.status(400).json({ message: "올바르지 않은 캔버스 ID예요" });
      }

      const round = await roundService.getActiveRound(canvasId);
      if (!round) {
        return res.status(404).json({ message: "진행 중인 라운드가 없어요" });
      }
      return res.json({ round });
    } catch (err) {
      return res.status(500).json({ message: String(err) });
    }
  },
};
