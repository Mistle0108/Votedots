import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { mypageController } from "./mypage.controller";

const router = Router();

router.get("/participations", authMiddleware, mypageController.getParticipations);
router.get(
  "/participations/:canvasId",
  authMiddleware,
  mypageController.getParticipationDetail,
);
router.get("/stats", authMiddleware, mypageController.getStats);

export default router;
