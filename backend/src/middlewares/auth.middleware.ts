import { Request, Response, NextFunction } from "express";
import { AUTH_ERROR_MESSAGES } from "../modules/auth/auth.validation";

function sendLoginRequired(res: Response) {
  return res.status(401).json({ message: "로그인이 필요해요" });
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.session.voter) {
    return sendLoginRequired(res);
  }
  next();
};

export const memberOnlyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.session.voter) {
    return sendLoginRequired(res);
  }

  if (req.session.voter.isGuest) {
    return res.status(403).json({ message: AUTH_ERROR_MESSAGES.MEMBER_ONLY });
  }

  next();
};
