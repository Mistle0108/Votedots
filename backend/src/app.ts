import "reflect-metadata";
import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import { AppDataSource } from "./database/data-source";
import { getDbConnectionState } from "./database/db-connection.manager";
import { clientUrls } from "./config/client-url";
import { sessionMiddleware } from "./config/session";
import { redisClient } from "./config/redis";

import authRouter from "./modules/auth/auth.router";
import canvasRouter from "./modules/canvas/canvas.router";
import loginBoardRouter from "./modules/login-board/login-board.router";
import roundRouter from "./modules/round/round.router";
import voteRouter from "./modules/vote/vote.router";

function createNoopIo(): Server {
  const roomTarget = {
    emit: () => roomTarget,
    disconnectSockets: () => roomTarget,
  };

  return {
    to: () => roomTarget,
    in: () => roomTarget,
  } as unknown as Server;
}

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.set("io", createNoopIo());

  app.use(
    cors({
      origin: clientUrls,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(sessionMiddleware);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/health/redis", async (_req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Not found" });
    }

    try {
      await redisClient.set("test", "ok");
      const value = await redisClient.get("test");
      res.json({ status: "ok", value });
    } catch (err) {
      res.status(500).json({ status: "error", message: String(err) });
    }
  });

  app.get("/health/db", async (_req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Not found" });
    }

    const connection = getDbConnectionState();

    if (!AppDataSource.isInitialized) {
      return res.status(503).json({
        status: "error",
        message: "DB is not connected",
      });
    }

    try {
      await AppDataSource.query("SELECT 1");

      return res.json({
        status: "ok",
      });
    } catch (err) {
      return res.status(503).json({
        status: "error",
        message: "DB health check failed",
      });
    }
  });

  app.use("/auth", authRouter);
  app.use("/canvas", canvasRouter);
  app.use("/public/login-board", loginBoardRouter);
  app.use("/canvas/:canvasId/rounds", roundRouter);
  app.use("/vote", voteRouter);

  return app;
}
