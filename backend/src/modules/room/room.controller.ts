import type { Request, Response } from "express";
import { Room, RoomType } from "../../entities/room.entity";
import {
  getCanvasGameConfigSnapshot,
  getGameConfigProfiles,
} from "../../config/game.config";
import { GamePhase } from "../game/game-phase.types";
import { forceGameEnd, stopGameTimer } from "../game/game.timer";
import { roundSnapshotService } from "../history/round-snapshot.service";
import { resolveResultTemplateAssetKey } from "../canvas/template/result-template.service";
import { roundService } from "../round/round.service";
import { roomService, type CreateRoomInput } from "./room.service";

function parsePublicRoomNumber(raw: unknown): number | null {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function serializeRoomListItem(
  room: Room,
  participantCount: number,
  isOwner: boolean,
) {
  return {
    roomId: room.id,
    publicRoomNumber: room.publicRoomNumber,
    title: room.title,
    type: room.type,
    status: room.status,
    participantCount,
    isOwner,
  };
}

function serializePrivateRoomDetail(room: Room) {
  return {
    roomId: room.id,
    publicRoomNumber: room.publicRoomNumber,
    title: room.title,
    type: room.type,
    status: room.status,
  };
}

function serializeManageInfo(room: Room) {
  return {
    settings: room.settingsSnapshot,
    accessCode: room.type === RoomType.PRIVATE ? room.accessCode : null,
  };
}

function serializeRoomDetail(
  room: Room,
  participantCount: number,
  snapshotUrl: string | null,
) {
  const resultTemplateAssetKey = resolveResultTemplateAssetKey({
    resultTemplateAssetKey: room.canvas.resultTemplateAssetKey,
  });

  return {
    roomId: room.id,
    publicRoomNumber: room.publicRoomNumber,
    title: room.title,
    type: room.type,
    status: room.status,
    canvas: {
      id: room.canvas.id,
      gridX: room.canvas.gridX,
      gridY: room.canvas.gridY,
      currentRoundNumber: room.canvas.currentRoundNumber,
      totalRounds: room.canvas.configSnapshot.rules.totalRounds,
      snapshotUrl,
      templateImageUrl: resultTemplateAssetKey
        ? `/result-templates/${resultTemplateAssetKey}.png`
        : null,
    },
    participantCount,
  };
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function applyRoomSessionContext(
  req: Request,
  context:
    | {
        roomId: number;
        publicRoomNumber: number | null;
        canvasId: number;
        type: string;
      }
    | null,
): Promise<void> {
  if (context) {
    req.session.room = context;
  } else {
    delete req.session.room;
  }

  await saveSession(req);
}

export const roomController = {
  async getConfigProfiles(_req: Request, res: Response) {
    return res.json({
      profiles: getGameConfigProfiles(),
    });
  },

  async create(req: Request, res: Response) {
    try {
      const body = req.body as Partial<CreateRoomInput>;
      const result = await roomService.create(req.app.get("io"), req.session.voter!.id, {
        title: String(body.title ?? ""),
        type: body.type as CreateRoomInput["type"],
        profileKey:
          typeof body.profileKey === "string" ? body.profileKey : undefined,
        introPhaseSec: Number(body.introPhaseSec),
        totalRounds: Number(body.totalRounds),
        votesPerRound: Number(body.votesPerRound),
      });

      await applyRoomSessionContext(req, result.sessionContext);

      return res.status(201).json({
        room: {
          roomId: result.room.id,
          publicRoomNumber: result.room.publicRoomNumber,
          title: result.room.title,
          type: result.room.type,
        },
        accessCode: result.accessCode,
        entered: Boolean(result.sessionContext),
      });
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async list(_req: Request, res: Response) {
    try {
      const rooms = await roomService.getListWithParticipantCount();
      const currentVoterId = _req.session.voter?.id;
      return res.json({
        rooms: rooms.map(({ room, participantCount }) =>
          serializeRoomListItem(
            room,
            participantCount,
            currentVoterId !== undefined && room.owner?.id === currentVoterId,
          ),
        ),
      });
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async getDetail(req: Request, res: Response) {
    try {
      const publicRoomNumber = parsePublicRoomNumber(
        req.params["publicRoomNumber"],
      );

      if (!publicRoomNumber) {
        return res.status(400).json({ message: "ROOM_NUMBER_INVALID" });
      }

      const room = await roomService.getPublicDetail(publicRoomNumber);
      const isOwner =
        req.session.voter?.id !== undefined &&
        room.owner?.id === req.session.voter.id;

      if (room.type === RoomType.PRIVATE) {
        return res.json({
          room: {
            ...serializePrivateRoomDetail(room),
            manage: isOwner ? serializeManageInfo(room) : null,
          },
        });
      }

      const [participantCount, snapshot] = await Promise.all([
        roomService.getParticipantCount(room),
        roundSnapshotService.findLatestRoundSnapshot(room.canvas.id),
      ]);

      return res.json({
        room: {
          ...serializeRoomDetail(
            room,
            participantCount,
            snapshot?.round?.id
              ? roundSnapshotService.buildRoundSnapshotApiPath(
                  room.canvas.id,
                  snapshot.round.id,
                )
              : null,
          ),
          manage: isOwner ? serializeManageInfo(room) : null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message === "ROOM_NOT_FOUND" ? 404 : 400;

      return res.status(status).json({ message });
    }
  },

  async enter(req: Request, res: Response) {
    try {
      const roomType =
        req.body?.type === RoomType.PUBLIC || req.body?.type === RoomType.PRIVATE
          ? req.body.type
          : null;
      let result;

      if (roomType === RoomType.PUBLIC) {
        const publicRoomNumber = parsePublicRoomNumber(req.body?.publicRoomNumber);

        if (!publicRoomNumber) {
          return res.status(400).json({ message: "ROOM_NUMBER_INVALID" });
        }

        result = await roomService.enterPublic(publicRoomNumber);
      } else if (roomType === RoomType.PRIVATE) {
        const accessCode = String(req.body?.accessCode ?? "")
          .trim()
          .toUpperCase();

        if (!accessCode) {
          return res.status(400).json({ message: "ROOM_ACCESS_CODE_REQUIRED" });
        }

        result = await roomService.enterPrivate(accessCode);
      } else {
        return res.status(400).json({ message: "ROOM_TYPE_INVALID" });
      }

      await applyRoomSessionContext(req, result.sessionContext);

      return res.json({
        room: {
          roomId: result.room.id,
          publicRoomNumber: result.room.publicRoomNumber,
          type: result.room.type,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status =
        message === "ROOM_EXPIRED"
          ? 410
          : message === "ROOM_NOT_FOUND"
            ? 404
            : 400;

      return res.status(status).json({ message });
    }
  },

  async getCurrent(req: Request, res: Response) {
    try {
      const sessionRoom = req.session.room;

      if (!sessionRoom?.roomId) {
        return res.status(404).json({ message: "ROOM_CONTEXT_NOT_FOUND" });
      }

      const room = await roomService.getCurrent(sessionRoom.roomId);

      return res.json({
        room: {
          roomId: room.id,
          publicRoomNumber: room.publicRoomNumber,
          title: room.title,
          type: room.type,
          status: room.status,
        },
        canvas: {
          id: room.canvas.id,
          gridX: room.canvas.gridX,
          gridY: room.canvas.gridY,
          configProfileKey: room.canvas.configProfileKey,
          resultTemplateAssetKey: room.canvas.resultTemplateAssetKey,
          status: room.canvas.status,
          phase: room.canvas.phase,
          phaseStartedAt: room.canvas.phaseStartedAt,
          phaseEndsAt: room.canvas.phaseEndsAt,
          currentRoundNumber: room.canvas.currentRoundNumber,
          startedAt: room.canvas.startedAt,
          endedAt: room.canvas.endedAt,
        },
        serverNow: new Date().toISOString(),
        gameConfig: getCanvasGameConfigSnapshot(room.canvas),
      });
    } catch (error) {
      await applyRoomSessionContext(req, null);

      return res.status(404).json({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async getCurrentParticipantCount(req: Request, res: Response) {
    try {
      const sessionRoom = req.session.room;

      if (!sessionRoom?.roomId) {
        return res.status(404).json({ message: "ROOM_CONTEXT_NOT_FOUND" });
      }

      const room = await roomService.getCurrent(sessionRoom.roomId);
      const count = await roomService.getParticipantCount(room);

      return res.json({ count });
    } catch (error) {
      await applyRoomSessionContext(req, null);

      return res.status(404).json({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async getCurrentParticipantList(req: Request, res: Response) {
    try {
      const sessionRoom = req.session.room;

      if (!sessionRoom?.roomId) {
        return res.status(404).json({ message: "ROOM_CONTEXT_NOT_FOUND" });
      }

      const room = await roomService.getCurrent(sessionRoom.roomId);
      const participants = await roomService.getParticipantList(room);

      return res.json({ participants });
    } catch (error) {
      await applyRoomSessionContext(req, null);

      return res.status(404).json({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async getCurrentManage(req: Request, res: Response) {
    try {
      const sessionRoom = req.session.room;

      if (!sessionRoom?.roomId) {
        return res.status(404).json({ message: "ROOM_CONTEXT_NOT_FOUND" });
      }

      const room = await roomService.getCurrentManage(
        sessionRoom.roomId,
        req.session.voter!.id,
      );

      return res.json({
        room: {
          roomId: room.id,
          publicRoomNumber: room.publicRoomNumber,
          title: room.title,
          type: room.type,
          settings: room.settingsSnapshot,
          accessCode: room.type === RoomType.PRIVATE ? room.accessCode : null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status =
        message === "ROOM_MANAGE_FORBIDDEN"
          ? 403
          : message === "ROOM_CONTEXT_NOT_FOUND"
            ? 404
            : 400;

      return res.status(status).json({ message });
    }
  },

  async terminateCurrent(req: Request, res: Response) {
    try {
      const sessionRoom = req.session.room;

      if (!sessionRoom?.roomId) {
        return res.status(404).json({ message: "ROOM_CONTEXT_NOT_FOUND" });
      }

      const room = await roomService.getCurrentManage(
        sessionRoom.roomId,
        req.session.voter!.id,
      );
      const io = req.app.get("io");

      if (room.type === RoomType.PLAZA) {
        return res.status(403).json({ message: "ROOM_MANAGE_FORBIDDEN" });
      }

      if (room.status === "expired") {
        return res.status(410).json({ message: "ROOM_EXPIRED" });
      }

      stopGameTimer(room.canvas.id);

      if (room.canvas.phase === GamePhase.INTRO || room.canvas.phase === GamePhase.GAME_END) {
        const expiredRoom = await roomService.expireByOwner(room.id);

        io.to(`canvas:${room.canvas.id}`).emit("room:expired", {
          canvasId: room.canvas.id,
          roomId: expiredRoom.id,
          reason: "terminated_by_owner",
        });

        return res.json({ ok: true });
      }

      if (room.canvas.phase === GamePhase.ROUND_ACTIVE) {
        const activeRound = await roomService.getActiveRound(room.canvas.id);

        if (!activeRound) {
          return res.status(400).json({ message: "ROOM_ACTIVE_ROUND_NOT_FOUND" });
        }

        await roundService.endRound(room.canvas.id, activeRound.id, io);
        await forceGameEnd(io, room.canvas.id, activeRound.roundNumber);
        stopGameTimer(room.canvas.id);
        const expiredRoom = await roomService.expireByOwner(room.id);

        io.to(`canvas:${room.canvas.id}`).emit("room:expired", {
          canvasId: room.canvas.id,
          roomId: expiredRoom.id,
          reason: "terminated_by_owner",
        });
        return res.json({ ok: true });
      }

      if (room.canvas.phase === GamePhase.ROUND_RESULT) {
        await forceGameEnd(io, room.canvas.id, room.canvas.currentRoundNumber);
        stopGameTimer(room.canvas.id);
        const expiredRoom = await roomService.expireByOwner(room.id);

        io.to(`canvas:${room.canvas.id}`).emit("room:expired", {
          canvasId: room.canvas.id,
          roomId: expiredRoom.id,
          reason: "terminated_by_owner",
        });
        return res.json({ ok: true });
      }

      if (room.canvas.phase === GamePhase.ROUND_START_WAIT) {
        const lastValidRoundNumber = Math.max(0, room.canvas.currentRoundNumber - 1);

        if (lastValidRoundNumber === 0) {
          const expiredRoom = await roomService.expireByOwner(room.id);

          io.to(`canvas:${room.canvas.id}`).emit("room:expired", {
            canvasId: room.canvas.id,
            roomId: expiredRoom.id,
            reason: "terminated_by_owner",
          });

          return res.json({ ok: true });
        }

        await forceGameEnd(io, room.canvas.id, lastValidRoundNumber);
        stopGameTimer(room.canvas.id);
        const expiredRoom = await roomService.expireByOwner(room.id);

        io.to(`canvas:${room.canvas.id}`).emit("room:expired", {
          canvasId: room.canvas.id,
          roomId: expiredRoom.id,
          reason: "terminated_by_owner",
        });
        return res.json({ ok: true });
      }

      return res.status(400).json({ message: "ROOM_TERMINATION_PHASE_UNSUPPORTED" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status =
        message === "ROOM_MANAGE_FORBIDDEN"
          ? 403
          : message === "ROOM_CONTEXT_NOT_FOUND"
            ? 404
            : message === "ROOM_EXPIRED"
              ? 410
              : 400;

      return res.status(status).json({ message });
    }
  },
};
