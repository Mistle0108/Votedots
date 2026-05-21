import { Router } from "express";
import { memberOnlyMiddleware } from "../../middlewares/auth.middleware";
import { mypageController } from "./mypage.controller";

const router = Router();

router.get(
  "/participations",
  memberOnlyMiddleware,
  mypageController.getParticipations,
);
router.get(
  "/participations/:canvasId",
  memberOnlyMiddleware,
  mypageController.getParticipationDetail,
);
router.get("/stats", memberOnlyMiddleware, mypageController.getStats);

export default router;
