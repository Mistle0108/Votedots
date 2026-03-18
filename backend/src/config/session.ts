import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";

export const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient
  .connect()
  .then(() => console.log("Redis 연결 성공"))
  .catch((err) => console.error("Redis 연결 실패:", err));

export const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET ?? "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24, // 24시간
  },
});
