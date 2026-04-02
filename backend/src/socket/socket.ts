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
      return next(new Error("인증이 필요해요"));
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

    console.log(`소켓 연결: ${socket.id} (${socket.voterNickname})`);

    require("./socket.handler").registerHandlers(socket, io);

    socket.on("disconnect", async () => {
      try {
        if (socket.sessionId) {
          await participantSessionService.handleSocketDisconnect(
            socket.sessionId,
            socket.id,
          );
        }
      } catch (err) {
        console.error(
          `[소켓] disconnect 처리 실패 (socketId=${socket.id}):`,
          err,
        );
      }

      console.log(`소켓 해제: ${socket.id} (${socket.voterNickname})`);
    });
  });
}
