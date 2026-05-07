import { Router } from "express";
import { publicLandingController } from "./public-landing.controller";

const router = Router();

router.get("/", publicLandingController.getLandingPayload);
router.get(
  "/canvas/:canvasId/rounds/:roundId/snapshot",
  publicLandingController.getRoundSnapshot,
);

export default router;
