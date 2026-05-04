import { Router } from "express";
import { historyController } from "../history/history.controller";
import { canvasController } from "./canvas.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

// TO-BE
router.get("/current", authMiddleware, canvasController.getCurrent);
router.get("/:canvasId/history", authMiddleware, historyController.getCanvasHistory);
router.get("/:canvasId/chunks", authMiddleware, canvasController.getChunks);
router.get(
  "/current/participants/count",
  authMiddleware,
  canvasController.getCurrentParticipantCount,
);
router.get(
  "/current/participants",
  authMiddleware,
  canvasController.getCurrentParticipantList,
);
router.get("/:canvasId/summary", authMiddleware, canvasController.getSummary);

export default router;
