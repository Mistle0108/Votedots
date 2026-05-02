import http from "http";
import { Server as SocketIOServer } from "socket.io";
import type { Express } from "express";
import { initSocket } from "./socket/socket";

export function createServer(app: Express) {
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CLIENT_URL ?? "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  initSocket(io);
  app.set("io", io);

  return { server, io };
}
