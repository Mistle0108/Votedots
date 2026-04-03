import { Server, Socket } from "socket.io";
import { Request, Response, NextFunction } from "express";
import { sessionMiddleware } from "../config/session";
import { participantSessionService } from "../modules/participant/participant-session.service";

declare module "socket.io" {
  interface Socket {
    voterId?: number;
    voterUuid?: string;
    voterNickname?: string;
    sessionId?: string;
  }
}

export function getSessionRoom(sessionId: string): string {
  return `session:${sessionId}`;
}

const wrap =
  (middleware: (req: Request, res: Response, next: NextFunction) => void) =>
  (socket: Socket, next: (err?: Error) => void) =>
    middleware(socket.request as Request, {} as Response, next as NextFunction);

export function initSocket(io: Server): void {
  io.use(wrap(sessionMiddleware));

  io.use((socket, next) => {
    const req = socket.request as Request;
    const voter = req.session?.voter;

    if (!voter) {
      return next(new Error("Authentication is required"));
    }

    socket.voterId = voter.id;
    socket.voterUuid = voter.uuid;
    socket.voterNickname = voter.nickname;
    socket.sessionId = req.sessionID;
    next();
  });

  io.on("connection", (socket) => {
    if (socket.sessionId) {
      socket.join(getSessionRoom(socket.sessionId));
    }

    console.log(`socket connected: ${socket.id} (${socket.voterNickname})`);

    require("./socket.handler").registerHandlers(socket, io);

    socket.on("disconnect", async () => {
      try {
        if (socket.sessionId) {
          await participantSessionService.handleSocketDisconnect(
            socket.sessionId,
            socket.id,
            io,
          );
        }
      } catch (err) {
        console.error(
          `[socket] disconnect handling failed (socketId=${socket.id}):`,
          err,
        );
      }

      console.log(
        `socket disconnected: ${socket.id} (${socket.voterNickname})`,
      );
    });
  });
}
