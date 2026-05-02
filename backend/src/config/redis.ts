import { createClient } from "redis";

export const redisClient = createClient({ url: process.env.REDIS_URL });

export async function connectRedis(): Promise<void> {
  if (redisClient.isOpen) {
    return;
  }

  try {
    await redisClient.connect();
    console.log("Redis connected");
  } catch (err) {
    console.error("Redis connection failed:", err);
    throw err;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    return;
  }

  await redisClient.quit();
}
