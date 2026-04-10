import { Request, Response } from "express";
import { Server } from "socket.io";
import { getCanvasGameConfigSnapshot } from "../../config/game.config";
import { Canvas } from "../../entities/canvas.entity";
import { Cell } from "../../entities/cell.entity";
import { canvasService } from "./canvas.service";

interface CreateCanvasRequestBody {
  profileKey?: string;
}

function serializeCanvas(canvas: Canvas) {
  return {
    id: canvas.id,
    gridX: canvas.gridX,
    gridY: canvas.gridY,
    configProfileKey: canvas.configProfileKey,
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
    id: cell.id,
    x: cell.x,
    y: cell.y,
    color: cell.color,
    status: cell.status,
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

      const cells = await canvasService.getCells(canvas.id);
      return res.json({
        canvas: serializeCanvas(canvas),
        cells: cells.map(serializeCell),
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
};
