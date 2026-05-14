import { Navigate } from "react-router-dom";
import CanvasPage from "@/pages/canvas/CanvasPage";
import { roomSessionSourceApi } from "@/features/gameplay/session/api/session-source.api";
import { getStoredRoomSessionContext } from "@/features/room/model/room-session-context";

export default function RoomPage() {
  const roomSessionContext = getStoredRoomSessionContext();

  if (!roomSessionContext) {
    return <Navigate to="/lobby" replace />;
  }

  return <CanvasPage sessionSourceApi={roomSessionSourceApi} />;
}
