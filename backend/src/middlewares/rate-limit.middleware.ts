import type { Request, Response, NextFunction } from "express";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface CreateRateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

const buckets = new Map<string, RateLimitBucket>();

function buildBucketKey(req: Request): string {
  return `${req.ip}:${req.path}`;
}

export function createRateLimitMiddleware({
  windowMs,
  max,
  message,
}: CreateRateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = buildBucketKey(req);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (bucket.count >= max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
      );
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message });
    }

    bucket.count += 1;
    buckets.set(key, bucket);
    return next();
  };
}
