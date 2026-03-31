import { Request, Response } from "express";
import { Server } from "socket.io";
import { authService } from "./auth.service";
import { authSessionService } from "./auth-session.service";
import { getSessionRoom } from "../../socket/socket";

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

async function disconnectSessionSockets(
  io: Server,
  sessionId: string,
  reason: "replaced_by_newer_login" | "logged_out",
) {
  const sessionRoom = getSessionRoom(sessionId);
  const sockets = await io.in(sessionRoom).fetchSockets();

  for (const socket of sockets) {
    socket.emit("auth:session-ended", { reason });
    socket.disconnect(true);
  }
}

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { username, password, nickname } = req.body;

      if (!username || !password || !nickname) {
        return res.status(400).json({ message: "모든 항목을 입력해 주세요." });
      }

      const voter = await authService.register(username, password, nickname);
      return res
        .status(201)
        .json({ message: "회원가입이 완료되었습니다.", voter });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const io = req.app.get("io") as Server;
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ message: "아이디와 비밀번호를 입력해 주세요." });
      }

      const voter = await authService.login(username, password);
      await regenerateSession(req);

      req.session.voter = {
        id: voter.id,
        uuid: voter.uuid,
        nickname: voter.nickname,
        role: voter.role,
      };

      await saveSession(req);

      const replacedSessionId = await authSessionService.replaceActiveSession(
        voter.id,
        req.sessionID,
      );

      if (replacedSessionId) {
        await authSessionService.destroySession(replacedSessionId);
        await disconnectSessionSockets(
          io,
          replacedSessionId,
          "replaced_by_newer_login",
        );
      }

      return res.json({
        message: "로그인 성공",
        voter: { uuid: voter.uuid, nickname: voter.nickname },
      });
    } catch (err) {
      return res.status(401).json({ message: String(err) });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const io = req.app.get("io") as Server;
      const voterId = req.session.voter?.id;
      const sessionId = req.sessionID;

      if (voterId) {
        await authSessionService.clearActiveSession(voterId, sessionId);
      }

      await disconnectSessionSockets(io, sessionId, "logged_out");
      await destroySession(req);

      res.clearCookie("connect.sid");
      return res.json({ message: "로그아웃 되었습니다." });
    } catch (err) {
      return res
        .status(500)
        .json({ message: `로그아웃 중 오류가 발생했습니다: ${String(err)}` });
    }
  },

  async me(req: Request, res: Response) {
    return res.json({ voter: req.session.voter });
  },
};
