import { Router } from "express";
import { createRateLimitMiddleware } from "../../middlewares/rate-limit.middleware";
import { analyticsController } from "./analytics.controller";

const router = Router();

const analyticsRateLimit = createRateLimitMiddleware({
  windowMs: 1000 * 60,
  max: 120,
  message: "TOO_MANY_ANALYTICS_REQUESTS",
});

router.post("/events", analyticsRateLimit, analyticsController.trackVisitEvent);

export default router;
