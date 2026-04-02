import session from "express-session";
import { RedisStore } from "connect-redis";
import { redisClient } from "./redis";

export const SESSION_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24;

export const sessionStore = new RedisStore({
  client: redisClient,
});

export const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET ?? "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  },
});
