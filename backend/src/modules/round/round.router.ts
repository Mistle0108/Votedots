import { Router } from "express";
import { roundController } from "./round.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router({ mergeParams: true });

router.post("/", authMiddleware, roundController.startRound);
router.post("/:roundId/end", authMiddleware, roundController.endRound);
router.get("/active", authMiddleware, roundController.getActiveRound);
router.get(
  "/:roundId/summary",
  authMiddleware,
  roundController.getRoundSummary,
);
router.get(
  "/:roundId/snapshot",
  authMiddleware,
  roundController.getRoundSnapshot,
);
router.get(
  "/:roundId/download-snapshot",
  authMiddleware,
  roundController.getRoundDownloadSnapshot,
);

export default router;
