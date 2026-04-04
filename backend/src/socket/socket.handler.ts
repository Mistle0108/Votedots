import { Server, Socket } from "socket.io";
import { participantSessionService } from "../modules/participant/participant-session.service";

export function registerHandlers(socket: Socket, io: Server): void {
  socket.on("join:canvas", async (canvasIdValue: number | string) => {
    try {
      const canvasId = Number(canvasIdValue);
      if (Number.isNaN(canvasId)) {
        socket.emit("canvas:error", {
          message: "Invalid canvas id",
        });
        return;
      }

      if (!socket.sessionId) {
        socket.emit("canvas:error", {
          message: "Session information was not found",
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

      await participantSessionService.broadcastParticipantsUpdated(
        io,
        canvasId,
      );

      console.log(
        `${socket.voterNickname} joined ${room} (socket: ${socket.id}, status: ${result.status})`,
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
          message: "Invalid canvas id",
        });
        return;
      }

      if (!socket.sessionId) {
        socket.emit("canvas:error", {
          message: "Session information was not found",
        });
        return;
      }

      await participantSessionService.leaveCanvas(
        canvasId,
        socket.sessionId,
        socket.id,
      );

      const room = `canvas:${canvasId}`;
      socket.leave(room);

      socket.emit("canvas:left", { canvasId });

      await participantSessionService.broadcastParticipantsUpdated(
        io,
        canvasId,
      );

      console.log(
        `${socket.voterNickname} left ${room} (socket: ${socket.id})`,
      );
    } catch (err) {
      socket.emit("canvas:error", { message: String(err) });
    }
  });
}
