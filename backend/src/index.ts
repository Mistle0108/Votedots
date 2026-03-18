import "reflect-metadata";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createClient } from "redis";
import cors from "cors";
import * as dotenv from "dotenv";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { AppDataSource } from "./database/data-source";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL ?? "http://localhost:5173" },
});

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true, // 쿠키 전송 허용
  }),
);
app.use(express.json());

// Redis 연결
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient
  .connect()
  .then(() => console.log("Redis 연결 성공"))
  .catch((err) => console.error("Redis 연결 실패:", err));

// 세션 설정
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET ?? "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // JS에서 쿠키 접근 차단
      secure: false, // HTTPS 아니면 false
      maxAge: 1000 * 60 * 60 * 24, // 24시간
    },
  }),
);

// TypeORM 연결
AppDataSource.initialize()
  .then(() => console.log("DB 연결 성공"))
  .catch((err) => console.error("DB 연결 실패:", err));

// Health check
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
  try {
    await AppDataSource.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

// Socket.io
io.on("connection", (socket) => {
  console.log("클라이언트 연결:", socket.id);
  socket.on("disconnect", () => {
    console.log("클라이언트 해제:", socket.id);
  });
});

const PORT = process.env.PORT ?? 5173;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
