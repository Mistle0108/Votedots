import { Router } from "express";
import { loginBoardController } from "./login-board.controller";

const router = Router();

router.get("/", loginBoardController.getBoard);

export default router;
