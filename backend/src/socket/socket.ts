import { Server, Socket } from "socket.io";
import { sessionMiddleware } from "../config/session";
import { Request, Response, NextFunction } from "express";

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

// express-session 미들웨어를 Socket.io에서 사용할 수 있도록 래핑
const wrap =
  (middleware: (req: Request, res: Response, next: NextFunction) => void) =>
  (socket: Socket, next: (err?: Error) => void) =>
    middleware(socket.request as Request, {} as Response, next as NextFunction);

export function initSocket(io: Server): void {
  // 세션 미들웨어 연결
  io.use(wrap(sessionMiddleware));

  // 세션 인증 미들웨어
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

    // 이벤트 핸들러 등록
    require("./socket.handler").registerHandlers(socket, io);

    socket.on("disconnect", () => {
      console.log(`소켓 해제: ${socket.id} (${socket.voterNickname})`);
    });
  });
}
