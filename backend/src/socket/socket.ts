import { Server, Socket } from "socket.io";
import { Request, Response, NextFunction } from "express";
import { sessionMiddleware } from "../config/session";

declare module "socket.io" {
  interface Socket {
    sessionId?: string;
    voterId?: number;
    voterUuid?: string;
    voterNickname?: string;
  }
}

const wrap =
  (middleware: (req: Request, res: Response, next: NextFunction) => void) =>
  (socket: Socket, next: (err?: Error) => void) =>
    middleware(socket.request as Request, {} as Response, next as NextFunction);

export function getSessionRoom(sessionId: string): string {
  return `session:${sessionId}`;
}

export function initSocket(io: Server): void {
  io.use(wrap(sessionMiddleware));

  io.use((socket, next) => {
    const req = socket.request as Request;
    const voter = req.session?.voter;
    const sessionId = req.sessionID;

    if (!voter || !sessionId) {
      return next(new Error("인증이 필요합니다."));
    }

    socket.sessionId = sessionId;
    socket.voterId = voter.id;
    socket.voterUuid = voter.uuid;
    socket.voterNickname = voter.nickname;
    next();
  });

  io.on("connection", (socket) => {
    socket.join(getSessionRoom(socket.sessionId!));

    console.log(
      `소켓 연결: ${socket.id} (${socket.voterNickname}, session=${socket.sessionId})`,
    );

    require("./socket.handler").registerHandlers(socket, io);

    socket.on("disconnect", () => {
      console.log(
        `소켓 해제: ${socket.id} (${socket.voterNickname}, session=${socket.sessionId})`,
      );
    });
  });
}
