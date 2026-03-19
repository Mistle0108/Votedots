import { Request, Response } from "express";
import { authService } from "./auth.service";

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

      req.session.voter = {
        id: voter.id,
        uuid: voter.uuid,
        nickname: voter.nickname,
        role: voter.role,
      };

      return res.json({
        message: "로그인 성공",
        voter: { uuid: voter.uuid, nickname: voter.nickname },
      });
    } catch (err) {
      return res.status(401).json({ message: String(err) });
    }
  },

  async logout(req: Request, res: Response) {
    req.session.destroy((err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "로그아웃 중 오류가 발생했어요" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "로그아웃 됐어요" });
    });
  },

  async me(req: Request, res: Response) {
    return res.json({ voter: req.session.voter });
  },
};
