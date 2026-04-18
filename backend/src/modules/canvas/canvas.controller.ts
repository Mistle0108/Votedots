import { Request, Response } from "express";
import { Server } from "socket.io";
import { getCanvasGameConfigSnapshot } from "../../config/game.config";
import { Canvas } from "../../entities/canvas.entity";
import { Cell } from "../../entities/cell.entity";
import { canvasService } from "./canvas.service";
import { GameSummary } from "../../entities/game-summary.entity";
import { summaryService } from "../summary/summary.service";
import type { GetCanvasChunksQuery } from "./dto/get-canvas-chunks.dto";

interface CreateCanvasRequestBody {
  profileKey?: string;
}

function serializeCanvas(canvas: Canvas) {
  return {
    id: canvas.id,
    gridX: canvas.gridX,
    gridY: canvas.gridY,
    configProfileKey: canvas.configProfileKey,
    backgroundAssetKey: canvas.backgroundAssetKey,
    status: canvas.status,
    phase: canvas.phase,
    phaseStartedAt: canvas.phaseStartedAt,
    phaseEndsAt: canvas.phaseEndsAt,
    currentRoundNumber: canvas.currentRoundNumber,
    startedAt: canvas.startedAt,
    endedAt: canvas.endedAt,
  };
}

function serializeCell(cell: Cell) {
  return {
    x: cell.x,
    y: cell.y,
    color: cell.color,
    status: cell.status,
  };
}

// 게임 summary 응답 구조를 명시적으로 고정
function serializeGameSummary(summary: GameSummary) {
  return {
    id: summary.id,
    canvasId: summary.canvas.id,
    totalRounds: summary.totalRounds,
    participantCount: summary.participantCount,
    issuedTicketCount: summary.issuedTicketCount,
    totalVotes: summary.totalVotes,
    ticketUsageRate: summary.ticketUsageRate,
    totalCellCount: summary.totalCellCount,
    paintedCellCount: summary.paintedCellCount,
    emptyCellCount: summary.emptyCellCount,
    canvasCompletionPercent: summary.canvasCompletionPercent,
    mostVotedCellId: summary.mostVotedCellId,
    mostVotedCellX: summary.mostVotedCellX,
    mostVotedCellY: summary.mostVotedCellY,
    mostVotedCellVoteCount: summary.mostVotedCellVoteCount,
    randomResolvedCellCount: summary.randomResolvedCellCount,
    usedColorCount: summary.usedColorCount,
    mostSelectedColor: summary.mostSelectedColor,
    mostSelectedColorVoteCount: summary.mostSelectedColorVoteCount,
    mostPaintedColor: summary.mostPaintedColor,
    mostPaintedColorCellCount: summary.mostPaintedColorCellCount,
    topVoterId: summary.topVoterId,
    topVoterName: summary.topVoterName,
    topVoterVoteCount: summary.topVoterVoteCount,
    hottestRoundId: summary.hottestRoundId,
    hottestRoundNumber: summary.hottestRoundNumber,
    hottestRoundVoteCount: summary.hottestRoundVoteCount,
    topVoters: summary.topVotersJson,
    participants: summary.participantsJson,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

export const canvasController = {
  async create(req: Request, res: Response) {
    try {
      const io = req.app.get("io") as Server;
      const body = req.body as CreateCanvasRequestBody | undefined;
      const profileKey =
        typeof body?.profileKey === "string" ? body.profileKey : undefined;

      const canvas = await canvasService.create(io, { profileKey });

      return res.status(201).json({
        message: "캔버스가 생성되었습니다.",
        canvasId: canvas.id,
        profileKey: canvas.configProfileKey,
      });
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

      return res.json({
        canvas: serializeCanvas(canvas),
        cells: [],
        gameConfig: getCanvasGameConfigSnapshot(canvas),
      });
    } catch (err) {
      return res.status(500).json({ message: String(err) });
    }
  },

  async getCurrentParticipantCount(_req: Request, res: Response) {
    try {
      const result = await canvasService.getCurrentParticipantCount();
      return res.json({ count: result.count });
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
      return res.json({
        participants: result.participants.map((participant) => ({
          sessionId: participant.sessionId,
          voterUuid: participant.voterUuid,
          nickname: participant.nickname,
          status: participant.status,
        })),
      });
    } catch (err) {
      if (String(err).includes("진행 중인 캔버스가 없습니다.")) {
        return res.status(404).json({ message: String(err) });
      }

      return res.status(500).json({ message: String(err) });
    }
  },

  async getSummary(req: Request, res: Response) {
    try {
      const canvasId = parseInt(String(req.params["canvasId"]));

      if (isNaN(canvasId)) {
        return res.status(400).json({ message: "존재하지 않는 캔버스입니다." });
      }

      const summary = await summaryService.getGameSummary(canvasId);

      return res.json({
        data: serializeGameSummary(summary),
      });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },

  async getChunks(req: Request, res: Response) {
    try {
      const canvasId = parseInt(String(req.params["canvasId"]), 10);
      const query = req.query as Partial<
        Record<keyof GetCanvasChunksQuery, string>
      >;

      const startChunkX = parseInt(String(query.startChunkX), 10);
      const endChunkX = parseInt(String(query.endChunkX), 10);
      const startChunkY = parseInt(String(query.startChunkY), 10);
      const endChunkY = parseInt(String(query.endChunkY), 10);
      const chunkSize =
        query.chunkSize !== undefined
          ? parseInt(String(query.chunkSize), 10)
          : undefined;

      if (
        !Number.isFinite(canvasId) ||
        !Number.isFinite(startChunkX) ||
        !Number.isFinite(endChunkX) ||
        !Number.isFinite(startChunkY) ||
        !Number.isFinite(endChunkY)
      ) {
        return res
          .status(400)
          .json({ message: "chunk 조회 파라미터가 올바르지 않습니다." });
      }

      const result = await canvasService.getChunkCells({
        canvasId,
        startChunkX,
        endChunkX,
        startChunkY,
        endChunkY,
        chunkSize,
      });

      return res.json({
        chunkSize: result.chunkSize,
        ranges: result.ranges,
        bounds: result.bounds,
        cells: result.cells.map(serializeCell),
      });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },
};
