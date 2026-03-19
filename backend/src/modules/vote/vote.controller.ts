import { Request, Response } from "express";
import { voteService } from "./vote.service";

export const voteController = {
  async submit(req: Request, res: Response) {
    try {
      const voterId = req.session.voter!.id;
      const { roundId, cellId, color } = req.body;

      if (!roundId || !cellId || !color) {
        return res
          .status(400)
          .json({ message: "라운드 ID, 셀 ID, 색상을 모두 입력해주세요" });
      }

      const vote = await voteService.submit(voterId, roundId, cellId, color);
      return res.status(201).json({ message: "투표가 완료됐어요", vote });
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
