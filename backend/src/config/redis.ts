import { createClient } from "redis"

export const redisClient = createClient({ url: process.env.REDIS_URL })

redisClient
  .connect()
  .then(() => console.log("Redis 연결 성공"))
  .catch((err: Error) => console.error("Redis 연결 실패:", err.message))