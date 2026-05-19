import { Router } from "express";
import { publicLandingController } from "./public-landing.controller";

const router = Router();

router.get("/", publicLandingController.getLandingPayload);
router.get("/previews", publicLandingController.getFeaturedPreviews);
router.get("/completed", publicLandingController.getCompletedPreviews);
router.get(
  "/completed/:canvasId",
  publicLandingController.getCompletedPreviewDetail,
);
router.get("/previews/:previewId/asset", publicLandingController.getPreviewAsset);
router.get(
  "/canvas/:canvasId/rounds/:roundId/snapshot",
  publicLandingController.getRoundSnapshot,
);

export default router;
