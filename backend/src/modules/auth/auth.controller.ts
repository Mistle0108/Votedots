import { Request, Response } from "express";
import { participantSessionService } from "../participant/participant-session.service";
import { authSessionService } from "./auth-session.service";
import { authService } from "./auth.service";
import {
  AUTH_ERROR_MESSAGES,
  validateGuestSessionInput,
  validateLoginInput,
  validatePasswordValue,
  validateRegisterInput,
} from "./auth.validation";
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
  async createGuestSession(req: Request, res: Response) {
    try {
      const { nickname } = req.body ?? {};
      const validationError = validateGuestSessionInput({ nickname });

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      if (req.session.voter) {
        return res.status(409).json({
          message: AUTH_ERROR_MESSAGES.SESSION_ALREADY_EXISTS,
        });
      }

      await regenerateSession(req);

      const voter = await authService.createGuest(nickname);

      req.session.voter = {
        id: voter.id,
        uuid: voter.uuid,
        nickname: voter.nickname,
        role: voter.role,
        isGuest: voter.isGuest,
      };

      return res.status(201).json({
        message: "GUEST_SESSION_CREATED",
        voter: {
          uuid: voter.uuid,
          username: voter.username,
          nickname: voter.nickname,
          role: voter.role,
          isGuest: voter.isGuest,
          createdAt: voter.createdAt.toISOString(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      return res.status(500).json({ message });
    }
  },

  async register(req: Request, res: Response) {
    try {
      const {
        username,
        password,
        nickname,
        acceptedTerms,
        isAge14OrOlderConfirmed,
        termsAcceptedLocale,
      } = req.body;
      const validationError = validateRegisterInput({
        username,
        password,
        nickname,
        acceptedTerms,
        isAge14OrOlderConfirmed,
        termsAcceptedLocale,
      });

      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      await authService.register(username, password, nickname, {
        termsAcceptedLocale,
        isAge14OrOlderConfirmed,
      });
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
        isGuest: voter.isGuest,
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

  async changePassword(req: Request, res: Response) {
    try {
      const voterId = req.session.voter?.id;
      const { currentPassword, newPassword } = req.body;

      if (!voterId) {
        return res.status(401).json({ message: "AUTH_REQUIRED_LOGIN" });
      }

      const currentPasswordValidationError =
        typeof currentPassword === "string" && currentPassword.length > 0
          ? null
          : "AUTH_MISSING_CREDENTIALS";
      const newPasswordValidationError = validatePasswordValue(newPassword);

      if (currentPasswordValidationError || newPasswordValidationError) {
        return res.status(400).json({
          message: currentPasswordValidationError ?? newPasswordValidationError,
        });
      }

      await authService.changePassword(voterId, currentPassword, newPassword);

      return res.json({ message: "CHANGE_PASSWORD_SUCCESS" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message === "AUTH_INVALID_CREDENTIALS" ? 401 : 400;

      return res.status(status).json({ message });
    }
  },

  async withdraw(req: Request, res: Response) {
    try {
      const voterId = req.session.voter?.id;
      const currentSessionId = req.sessionID;
      const { password } = req.body;

      if (!voterId) {
        return res.status(401).json({ message: "AUTH_REQUIRED_LOGIN" });
      }

      if (typeof password !== "string" || password.length === 0) {
        return res.status(400).json({ message: "AUTH_MISSING_CREDENTIALS" });
      }

      await authService.withdraw(voterId, password);

      const activeSessionId = await authSessionService.revokeActiveSession(
        voterId,
      );
      const sessionIdsToClose = Array.from(
        new Set(
          [currentSessionId, activeSessionId].filter(
            (sessionId): sessionId is string => Boolean(sessionId),
          ),
        ),
      );
      const io = req.app.get("io");

      for (const sessionId of sessionIdsToClose) {
        await participantSessionService.removeAllParticipationsForSession(
          sessionId,
          io,
        );

        io.to(getSessionRoom(sessionId)).emit("auth:session-ended");
        io.in(getSessionRoom(sessionId)).disconnectSockets(true);

        if (sessionId !== currentSessionId) {
          await authSessionService.destroySession(sessionId);
        }
      }

      await destroyRequestSession(req);

      res.clearCookie("connect.sid");
      return res.json({ message: "WITHDRAW_SUCCESS" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message === "AUTH_INVALID_CREDENTIALS" ? 401 : 500;

      return res.status(status).json({ message });
    }
  },

  async me(req: Request, res: Response) {
    const sessionVoter = req.session.voter;

    if (!sessionVoter?.id) {
      return res.status(401).json({ message: "AUTH_REQUIRED_LOGIN" });
    }

    const voter = await authService.getMe(sessionVoter.id);

    return res.json({
      voter: {
        uuid: voter.uuid,
        username: voter.username,
        nickname: voter.nickname,
        role: voter.role,
        isGuest: voter.isGuest,
        createdAt: voter.createdAt.toISOString(),
      },
    });
  },
};
