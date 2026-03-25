import "reflect-metadata";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import * as dotenv from "dotenv";
import { AppDataSource } from "./database/data-source";
import { sessionMiddleware } from "./config/session";
import { redisClient } from "./config/redis";
import { initSocket } from "./socket/socket";

import authRouter from "./modules/auth/auth.router";
import canvasRouter from "./modules/canvas/canvas.router";
import roundRouter from "./modules/round/round.router";
import voteRouter from "./modules/vote/vote.router";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// 미들웨어
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(sessionMiddleware);

// TypeORM 연결
AppDataSource.initialize()
  .then(() => console.log("DB 연결 성공"))
  .catch((err) => console.error("DB 연결 실패:", err));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Redis 연결
app.get("/health/redis", async (_req, res) => {
  try {
    await redisClient.set("test", "ok");
    const value = await redisClient.get("test");
    res.json({ status: "ok", value });
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

// DB
app.get("/health/db", async (_req, res) => {
  try {
    await AppDataSource.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

// Socket.io 초기화 (세션 인증 미들웨어 포함)
initSocket(io);
app.set("io", io);

//Router
app.use("/auth", authRouter);
app.use("/canvas", canvasRouter);
app.use("/canvas/:canvasId/rounds", roundRouter);
app.use("/vote", voteRouter);

const PORT = process.env.PORT ?? 5173;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
