const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const redis = require("redis"); // 1. backend/src/index.js에 Redis 연결 테스트 추가
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:3000" },
});

// 1. backend/src/index.js에 Redis 연결 테스트 추가
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient
  .connect()
  .then(() => console.log("Redis 연결 성공"))
  .catch((err) => console.error("Redis 연결 실패:", err));

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 1. backend/src/index.js에 Redis 연결 테스트 추가
app.get("/health/redis", async (req, res) => {
  try {
    await redisClient.set("test", "ok");
    const value = await redisClient.get("test");
    res.json({ status: "ok", value });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 2. PostgreSQL 연결 확인
app.get("/health/db", async (req, res) => {
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

io.on("connection", (socket) => {
  console.log("클라이언트 연결:", socket.id);
  socket.on("disconnect", () => {
    console.log("클라이언트 해제:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
