import { Router } from "express";
import { canvasController } from "./canvas.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/", authMiddleware, canvasController.create);
router.get("/current", authMiddleware, canvasController.getCurrent);

export default router;
