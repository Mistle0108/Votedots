// TO-BE
import { Request, Response } from "express";
import { Server } from "socket.io";
import { voteService } from "./vote.service";

export const voteController = {
  async submit(req: Request, res: Response) {
    try {
      const io = req.app.get("io") as Server;
      const voterId = req.session.voter!.id;
      const sessionId = req.sessionID;
      const { canvasId, roundId, x, y, color } = req.body;

      if (!sessionId) {
        return res.status(401).json({ message: "세션 정보를 찾을 수 없어요" });
      }

      if (
        canvasId === undefined ||
        roundId === undefined ||
        x === undefined ||
        y === undefined ||
        !color
      ) {
        return res.status(400).json({
          message: "캔버스 ID, 라운드 ID, 좌표, 색상을 모두 입력해주세요",
        });
      }

      await voteService.submit(
        voterId,
        sessionId,
        Number(canvasId),
        Number(roundId),
        Number(x),
        Number(y),
        color,
        io,
      );

      return res.status(201).json({ message: "투표가 완료됐어요" });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },

  async getVoteStatus(req: Request, res: Response) {
    try {
      const roundId = parseInt(String(req.params["roundId"]));
      if (isNaN(roundId)) {
        return res.status(400).json({ message: "올바르지 않은 라운드 ID예요" });
      }

      const status = await voteService.getVoteStatus(roundId);
      return res.json({ status });
    } catch (err) {
      return res.status(500).json({ message: String(err) });
    }
  },

  async getRemainingTickets(req: Request, res: Response) {
    try {
      const voterId = req.session.voter!.id;
      const roundId = parseInt(String(req.params["roundId"]));
      if (isNaN(roundId)) {
        return res.status(400).json({ message: "올바르지 않은 라운드 ID예요" });
      }

      const remaining = await voteService.getRemainingTickets(voterId, roundId);
      return res.json({ remaining });
    } catch (err) {
      return res.status(500).json({ message: String(err) });
    }
  },
};
