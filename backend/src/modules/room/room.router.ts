import { Router } from "express";
import {
  authMiddleware,
  memberOnlyMiddleware,
} from "../../middlewares/auth.middleware";
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
router.get(
  "/current/manage",
  memberOnlyMiddleware,
  roomController.getCurrentManage,
);
router.post(
  "/current/end-game",
  memberOnlyMiddleware,
  roomController.endGameCurrent,
);
router.post(
  "/current/terminate",
  memberOnlyMiddleware,
  roomController.terminateCurrent,
);
router.post("/:roomId/enter-public", authMiddleware, roomController.enterPublicByRoomId);
router.get("/:roomId", roomController.getDetail);
router.post("/", memberOnlyMiddleware, roomController.create);
router.post("/enter", authMiddleware, roomController.enter);

export default router;
