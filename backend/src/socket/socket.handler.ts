import { Server, Socket } from "socket.io";

export function registerHandlers(socket: Socket, io: Server): void {
  // 캔버스 룸 입장
  socket.on("join:canvas", (canvasId: number) => {
    const room = `canvas:${canvasId}`;
    socket.join(room);
    console.log(
      `${socket.voterNickname} → 룸 입장: ${room} (소켓: ${socket.id})`,
    );
  });

  // 캔버스 룸 퇴장
  socket.on("leave:canvas", (canvasId: number) => {
    const room = `canvas:${canvasId}`;
    socket.leave(room);
    console.log(
      `${socket.voterNickname} → 룸 퇴장: ${room} (소켓: ${socket.id})`,
    );
  });
}