import { Router } from "express";
import { authController } from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { createRateLimitMiddleware } from "../../middlewares/rate-limit.middleware";

const router = Router();
const loginRateLimit = createRateLimitMiddleware({
  windowMs: 1000 * 60 * 5,
  max: 10,
  message: "TOO_MANY_LOGIN_ATTEMPTS",
});
const registerRateLimit = createRateLimitMiddleware({
  windowMs: 1000 * 60 * 10,
  max: 5,
  message: "TOO_MANY_REGISTER_ATTEMPTS",
});

router.post("/register", registerRateLimit, authController.register);
router.post("/login", loginRateLimit, authController.login);
router.post("/logout", authMiddleware, authController.logout);
router.get("/me", authMiddleware, authController.me);

export default router;
