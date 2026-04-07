import { Request, Response } from "express";
import { Server } from "socket.io";
import { canvasService } from "./canvas.service";
import { gameConfig } from "../../config/game.config";

export const canvasController = {
  async create(req: Request, res: Response) {
    try {
      const io = req.app.get("io") as Server;
      const canvas = await canvasService.create(io);
      return res
        .status(201)
        .json({ message: "캔버스가 생성되었습니다.", canvas });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },

  async getCurrent(req: Request, res: Response) {
    try {
      const canvas = await canvasService.getCurrent();
      if (!canvas) {
        return res
          .status(404)
          .json({ message: "진행 중인 캔버스가 없습니다." });
      }

      const cells = await canvasService.getCells(canvas.id);
      return res.json({
        canvas,
        cells,
        roundDurationSec: gameConfig.roundDurationSec,
        totalRounds: gameConfig.totalRounds,
        roundStartWaitSec: gameConfig.roundStartWaitSec,
        roundResultDelaySec: gameConfig.roundResultDelaySec,
        gameEndWaitSec: gameConfig.gameEndWaitSec,
      });
    } catch (err) {
      return res.status(500).json({ message: String(err) });
    }
  },

  async getCurrentParticipantCount(_req: Request, res: Response) {
    try {
      const result = await canvasService.getCurrentParticipantCount();
      return res.json(result);
    } catch (err) {
      if (String(err).includes("진행 중인 캔버스가 없습니다.")) {
        return res.status(404).json({ message: String(err) });
      }

      return res.status(500).json({ message: String(err) });
    }
  },

  async getCurrentParticipantList(_req: Request, res: Response) {
    try {
      const result = await canvasService.getCurrentParticipantList();
      return res.json(result);
    } catch (err) {
      if (String(err).includes("진행 중인 캔버스가 없습니다.")) {
        return res.status(404).json({ message: String(err) });
      }

      return res.status(500).json({ message: String(err) });
    }
  },
};
