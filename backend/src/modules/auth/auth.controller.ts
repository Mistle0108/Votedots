import { Request, Response } from "express";
import { authSessionService } from "./auth-session.service";
import { authService } from "./auth.service";
import { validateLoginInput, validateRegisterInput } from "./auth.validation";
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
      const validationError = validateRegisterInput({
        username,
        password,
        nickname,
      });

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      await authService.register(username, password, nickname);
      return res.status(201).json({ message: "REGISTER_SUCCESS" });
    } catch (err) {
      return res.status(400).json({
        message: err instanceof Error ? err.message : String(err),
      });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      const validationError = validateLoginInput({ username, password });

      if (validationError) {
        return res.status(400).json({ message: validationError });
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

      return res.json({ message: "LOGIN_SUCCESS" });
    } catch (err) {
      return res.status(401).json({
        message: err instanceof Error ? err.message : String(err),
      });
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
      return res.json({ message: "LOGOUT_SUCCESS" });
    } catch {
      return res.status(500).json({ message: "LOGOUT_FAILED" });
    }
  },

  async me(req: Request, res: Response) {
    const voter = req.session.voter!;

    return res.json({
      voter: {
        uuid: voter.uuid,
        nickname: voter.nickname,
        role: voter.role,
      },
    });
  },
};
