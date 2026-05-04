import session from "express-session";
import { RedisStore } from "connect-redis";
import { redisClient } from "./redis";

export const SESSION_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24;

export const sessionStore = new RedisStore({
  client: redisClient,
});

const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET;

if (isProduction && !sessionSecret) {
  throw new Error("SESSION_SECRET is required in production.");
}

export const sessionMiddleware = session({
  store: sessionStore,
  secret: sessionSecret ?? "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  },
});
