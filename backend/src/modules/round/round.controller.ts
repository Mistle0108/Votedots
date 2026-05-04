import { Request, Response } from "express";
import { access } from "node:fs/promises";
import { Server } from "socket.io";
import { roundService } from "./round.service";
import { RoundSummary } from "../../entities/round-summary.entity";
import { roundSnapshotService } from "../history/round-snapshot.service";
import { summaryService } from "../summary/summary.service";

function buildRoundSnapshotUrl(
  req: Request,
  canvasId: number,
  roundId: number,
): string {
  const relativePath = roundSnapshotService.buildRoundSnapshotApiPath(
    canvasId,
    roundId,
  );
  const host = req.get("host");

  return host ? `${req.protocol}://${host}${relativePath}` : relativePath;
}

// 엔티티를 그대로 노출하지 않고 API 응답 필드를 명시적으로 고정
function serializeRoundSummary(
  summary: RoundSummary,
  snapshotUrl: string | null,
) {
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
    snapshotUrl,
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

      const [summary, snapshot] = await Promise.all([
        summaryService.getRoundSummary(canvasId, roundId),
        roundSnapshotService.findRoundSnapshot(canvasId, roundId),
      ]);

      return res.json({
        data: serializeRoundSummary(
          summary,
          snapshot ? buildRoundSnapshotUrl(req, canvasId, roundId) : null,
        ),
      });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },

  async getRoundSnapshot(req: Request, res: Response) {
    try {
      const canvasId = parseInt(String(req.params["canvasId"]));
      const roundId = parseInt(String(req.params["roundId"]));

      if (isNaN(canvasId) || isNaN(roundId)) {
        return res
          .status(400)
          .json({ message: "존재하지 않는 캔버스 또는 라운드입니다." });
      }

      const snapshot = await roundSnapshotService.getRoundSnapshot(
        canvasId,
        roundId,
      );
      const absolutePath =
        roundSnapshotService.resolveRoundSnapshotAbsolutePath(snapshot);

      await access(absolutePath);

      res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
      res.type(snapshot.mimeType);

      return res.sendFile(absolutePath);
    } catch (err) {
      return res.status(404).json({ message: String(err) });
    }
  },
  async getRoundDownloadSnapshot(req: Request, res: Response) {
    try {
      const canvasId = parseInt(String(req.params["canvasId"]));
      const roundId = parseInt(String(req.params["roundId"]));

      if (isNaN(canvasId) || isNaN(roundId)) {
        return res
          .status(400)
          .json({ message: "존재하지 않는 캔버스 또는 라운드입니다." });
      }

      const snapshot = await roundSnapshotService.getRoundSnapshot(
        canvasId,
        roundId,
      );
      const absolutePath = await roundSnapshotService.ensureRoundDownloadSnapshot(
        canvasId,
        snapshot,
      );

      res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
      res.type(snapshot.mimeType);

      return res.sendFile(absolutePath);
    } catch (err) {
      return res.status(404).json({ message: String(err) });
    }
  },
  async getRoundHighResolutionDownloadSnapshot(req: Request, res: Response) {
    try {
      const canvasId = parseInt(String(req.params["canvasId"]));
      const roundId = parseInt(String(req.params["roundId"]));

      if (isNaN(canvasId) || isNaN(roundId)) {
        return res
          .status(400)
          .json({ message: "議댁옱?섏? ?딅뒗 罹붾쾭???먮뒗 ?쇱슫?쒖엯?덈떎." });
      }

      const snapshot = await roundSnapshotService.getRoundSnapshot(
        canvasId,
        roundId,
      );
      const absolutePath =
        await roundSnapshotService.ensureRoundHighResolutionDownloadSnapshot(
          canvasId,
          snapshot,
        );

      res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
      res.type(snapshot.mimeType);

      return res.sendFile(absolutePath);
    } catch (err) {
      return res.status(404).json({ message: String(err) });
    }
  },
};
