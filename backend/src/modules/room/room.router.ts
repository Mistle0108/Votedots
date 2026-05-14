import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { roomController } from "./room.controller";

const router = Router();

router.get("/", authMiddleware, roomController.list);
router.get("/current", authMiddleware, roomController.getCurrent);
router.get("/current/manage", authMiddleware, roomController.getCurrentManage);
router.get("/:publicRoomNumber", authMiddleware, roomController.getDetail);
router.post("/", authMiddleware, roomController.create);
router.post("/enter", authMiddleware, roomController.enter);

export default router;
