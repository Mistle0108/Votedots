import type { Request, Response } from "express";
import { loginBoardContentService } from "./login-board-content.service";

export const loginBoardController = {
  async getBoard(_req: Request, res: Response) {
    try {
      const payload = await loginBoardContentService.getBoardPayload();
      res.setHeader("Cache-Control", "no-store");
      return res.json(payload);
    } catch (error) {
      console.error("[login-board] failed to load board content:", error);
      return res.status(500).json({
        message: "로그인 게시판 콘텐츠를 불러오지 못했어요.",
      });
    }
  },
};
