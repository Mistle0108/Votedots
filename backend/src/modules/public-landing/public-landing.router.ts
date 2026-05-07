import { Router } from "express";
import { publicLandingController } from "./public-landing.controller";

const router = Router();

router.get("/", publicLandingController.getLandingPayload);
router.get("/previews", publicLandingController.getFeaturedPreviews);
router.get("/previews/:previewId/asset", publicLandingController.getPreviewAsset);
router.get(
  "/canvas/:canvasId/rounds/:roundId/snapshot",
  publicLandingController.getRoundSnapshot,
);

export default router;
