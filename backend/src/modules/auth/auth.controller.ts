import { Request, Response } from "express";
import { authService } from "./auth.service";
import { authSessionService } from "./auth-session.service";
import { getSessionRoom } from "../../socket/socket";

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function destroyRequestSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { username, password, nickname } = req.body;

      if (!username || !password || !nickname) {
        return res.status(400).json({ message: "모든 항목을 입력해주세요" });
      }

      const voter = await authService.register(username, password, nickname);
      return res.status(201).json({ message: "회원가입이 완료됐어요", voter });
    } catch (err) {
      return res.status(400).json({ message: String(err) });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ message: "아이디와 비밀번호를 입력해주세요" });
      }

      const voter = await authService.login(username, password);

      await regenerateSession(req);

      req.session.voter = {
        id: voter.id,
        uuid: voter.uuid,
        nickname: voter.nickname,
        role: voter.role,
      };

      const previousSessionId = await authSessionService.replaceActiveSession(
        voter.id,
        req.sessionID,
      );

      if (previousSessionId && previousSessionId !== req.sessionID) {
        const io = req.app.get("io");
        io.to(getSessionRoom(previousSessionId)).emit("auth:session-ended");
        io.in(getSessionRoom(previousSessionId)).disconnectSockets(true);
        await authSessionService.destroySession(previousSessionId);
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
      const voterId = req.session.voter?.id;
      const sessionId = req.sessionID;

      if (voterId) {
        await authSessionService.clearActiveSession(voterId, sessionId);
      }

      await destroyRequestSession(req);

      res.clearCookie("connect.sid");
      return res.json({ message: "로그아웃 됐어요" });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "로그아웃 중 오류가 발생했어요" });
    }
  },

  async me(req: Request, res: Response) {
    return res.json({ voter: req.session.voter });
  },
};
