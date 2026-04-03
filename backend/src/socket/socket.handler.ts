import { Server, Socket } from "socket.io";
import { participantSessionService } from "../modules/participant/participant-session.service";

export function registerHandlers(socket: Socket, io: Server): void {
  socket.on("join:canvas", async (canvasIdValue: number | string) => {
    try {
      const canvasId = Number(canvasIdValue);
      if (Number.isNaN(canvasId)) {
        socket.emit("canvas:error", {
          message: "올바르지 않은 캔버스 ID예요",
        });
        return;
      }

      if (!socket.sessionId) {
        socket.emit("canvas:error", {
          message: "세션 정보를 찾을 수 없어요",
        });
        return;
      }

      const result = await participantSessionService.joinCanvas(
        canvasId,
        socket.sessionId,
        socket.id,
        io,
      );

      const room = `canvas:${canvasId}`;
      socket.join(room);

      socket.emit("canvas:joined", {
        canvasId,
        status: result.status,
        restored: result.restored,
      });

      console.log(
        `${socket.voterNickname} → 룸 입장: ${room} (소켓: ${socket.id}, 상태: ${result.status})`,
      );
    } catch (err) {
      socket.emit("canvas:error", { message: String(err) });
    }
  });

  socket.on("leave:canvas", async (canvasIdValue: number | string) => {
    try {
      const canvasId = Number(canvasIdValue);
      if (Number.isNaN(canvasId)) {
        socket.emit("canvas:error", {
          message: "올바르지 않은 캔버스 ID예요",
        });
        return;
      }

      if (!socket.sessionId) {
        socket.emit("canvas:error", {
          message: "세션 정보를 찾을 수 없어요",
        });
        return;
      }

      await participantSessionService.leaveCanvas(
        canvasId,
        socket.sessionId,
        socket.id,
        io,
      );

      const room = `canvas:${canvasId}`;
      socket.leave(room);

      socket.emit("canvas:left", { canvasId });

      console.log(
        `${socket.voterNickname} → 룸 퇴장: ${room} (소켓: ${socket.id})`,
      );
    } catch (err) {
      socket.emit("canvas:error", { message: String(err) });
    }
  });
}
