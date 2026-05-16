import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { roomController } from "./room.controller";

const router = Router();

router.get("/", roomController.list);
router.get("/config-profiles", roomController.getConfigProfiles);
router.get("/current", authMiddleware, roomController.getCurrent);
router.get(
  "/current/participants/count",
  authMiddleware,
  roomController.getCurrentParticipantCount,
);
router.get(
  "/current/participants",
  authMiddleware,
  roomController.getCurrentParticipantList,
);
router.get("/current/manage", authMiddleware, roomController.getCurrentManage);
router.post("/current/end-game", authMiddleware, roomController.endGameCurrent);
router.post("/current/terminate", authMiddleware, roomController.terminateCurrent);
router.post("/:roomId/enter-public", authMiddleware, roomController.enterPublicByRoomId);
router.get("/:roomId", roomController.getDetail);
router.post("/", authMiddleware, roomController.create);
router.post("/enter", authMiddleware, roomController.enter);

export default router;
