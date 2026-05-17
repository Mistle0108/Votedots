import { Router } from "express";
import { publicCanvasController } from "./public-canvas.controller";

const router = Router();

router.get("/:canvasId/final-result", publicCanvasController.getFinalResultImage);

export default router;
