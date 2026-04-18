import { Router } from "express";
import { voteController } from "./vote.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/", authMiddleware, voteController.submit);
router.get(
  "/rounds/:roundId/status",
  authMiddleware,
  voteController.getVoteStatus,
);
router.get(
  "/rounds/:roundId/tickets",
  authMiddleware,
  voteController.getRemainingTickets,
);

export default router;
