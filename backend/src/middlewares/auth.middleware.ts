import { Request, Response, NextFunction } from "express";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.session.voter) {
    return res.status(401).json({ message: "로그인이 필요해요" });
  }
  next();
};
