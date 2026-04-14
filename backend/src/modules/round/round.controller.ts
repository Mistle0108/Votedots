import { Request, Response } from "express";
import { Server } from "socket.io";
import { roundService } from "./round.service";
import { RoundSummary } from "../../entities/round-summary.entity";
import { summaryService } from "../summary/summary.service";

// 엔티티를 그대로 노출하지 않고 API 응답 필드를 명시적으로 고정
function serializeRoundSummary(summary: RoundSummary) {
  return {
    id: summary.id,
    canvasId: summary.canvas.id,
    roundId: summary.round.id,
    roundNumber: summary.roundNumber,
    participantCount: summary.participantCount,
    totalVotes: summary.totalVotes,
    paintedCellCount: summary.paintedCellCount,
    totalCellCount: summary.totalCellCount,
    currentPaintedCellCount: summary.currentPaintedCellCount,
    canvasProgressPercent: summary.canvasProgressPercent,
    mostVotedCellId: summary.mostVotedCellId,
    mostVotedCellX: summary.mostVotedCellX,
    mostVotedCellY: summary.mostVotedCellY,
    mostVotedCellVoteCount: summary.mostVotedCellVoteCount,
    randomResolvedCellCount: summary.randomResolvedCellCount,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

export const roundController = {
  async startRound(req: Request, res: Response) {
    try {
      const io = req.app.get("io") as Server;
      const canvasId = parseInt(String(req.params["canvasId"]));

      if (isNaN(canvasId)) {
        return res.status(400).json({ message: "올바르지 않은 캔버스 ID예요" });
      }

      await roundService.startRound(canvasId, io);
      return res.status(201).json({ message: "라운드가 시작됐어요" });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },

  async endRound(req: Request, res: Response) {
    try {
      const io = req.app.get("io") as Server;
      const canvasId = parseInt(String(req.params["canvasId"]));
      const roundId = parseInt(String(req.params["roundId"]));

      if (isNaN(canvasId) || isNaN(roundId)) {
        return res.status(400).json({ message: "올바르지 않은 ID예요" });
      }

      await roundService.endRound(canvasId, roundId, io);
      return res.json({ message: "라운드가 종료됐어요" });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },

  async getActiveRound(req: Request, res: Response) {
    try {
      const canvasId = parseInt(String(req.params["canvasId"]));
      if (isNaN(canvasId)) {
        return res
          .status(400)
          .json({ message: "올바르지 않은 캔버스 ID입니다." });
      }

      const roundState = await roundService.getActiveRoundState(canvasId);
      if (!roundState) {
        return res
          .status(404)
          .json({ message: "진행 중인 라운드가 없습니다." });
      }

      return res.json(roundState);
    } catch (err) {
      return res.status(500).json({ message: String(err) });
    }
  },

  async getRoundSummary(req: Request, res: Response) {
    try {
      const canvasId = parseInt(String(req.params["canvasId"]));
      const roundId = parseInt(String(req.params["roundId"]));

      if (isNaN(canvasId) || isNaN(roundId)) {
        return res
          .status(400)
          .json({ message: "존재하지 않는 캔버스 또는 라운드입니다." });
      }

      const summary = await summaryService.getRoundSummary(canvasId, roundId);

      return res.json({
        data: serializeRoundSummary(summary),
      });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },
};
