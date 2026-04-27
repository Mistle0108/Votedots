import "reflect-metadata";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import * as dotenv from "dotenv";
import { AppDataSource } from "./database/data-source";
import {
  connectWithRetry,
  getDbConnectionState,
} from "./database/db-connection.manager";
import { sessionMiddleware } from "./config/session";
import { redisClient } from "./config/redis";
import { initSocket } from "./socket/socket";
import { ensureGameHistoryStorageRoot } from "./modules/history/history-storage.service";

import authRouter from "./modules/auth/auth.router";
import canvasRouter from "./modules/canvas/canvas.router";
import loginBoardRouter from "./modules/login-board/login-board.router";
import roundRouter from "./modules/round/round.router";
import voteRouter from "./modules/vote/vote.router";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(sessionMiddleware);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/health/redis", async (_req, res) => {
  try {
    await redisClient.set("test", "ok");
    const value = await redisClient.get("test");
    res.json({ status: "ok", value });
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

app.get("/health/db", async (_req, res) => {
  const connection = getDbConnectionState();

  if (!AppDataSource.isInitialized) {
    return res.status(503).json({
      status: "error",
      message: connection.lastError ?? "DB is not connected",
      connection,
    });
  }

  try {
    await AppDataSource.query("SELECT 1");

    return res.json({
      status: "ok",
      connection: getDbConnectionState(),
    });
  } catch (err) {
    return res.status(503).json({
      status: "error",
      message: String(err),
      connection: getDbConnectionState(),
    });
  }
});

initSocket(io);
app.set("io", io);

app.use("/auth", authRouter);
app.use("/canvas", canvasRouter);
app.use("/public/login-board", loginBoardRouter);
app.use("/canvas/:canvasId/rounds", roundRouter);
app.use("/vote", voteRouter);

async function startServer() {
  try {
    await ensureGameHistoryStorageRoot();
  } catch (error) {
    console.error(
      "[storage] failed to initialize game history storage root:",
      error,
    );
    process.exit(1);
    return;
  }

  void connectWithRetry(io, "server startup");

  const PORT = process.env.PORT ?? 4000;
  server.listen(PORT, () => {
    console.log(`서버 실행 중 http://localhost:${PORT}`);
  });
}

void startServer();
