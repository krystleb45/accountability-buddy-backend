// src/api/routes/auth.ts

import { Router, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { check, validationResult } from "express-validator";
import authController from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";
import { logger } from "../../utils/winstonLogger";

const router = Router();

// ─── limit login/register to 10 per 15min ─────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many authentication attempts. Please try again later.",
});

// ─── wrapper to catch sync+async errors ──────────────────────────────────
function wrap(handler: RequestHandler): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      logger.error(`Auth route error: ${(err as Error).message}`);
      next(err);
    }
  };
}

// ─── POST /api/auth/register ─────────────────────────────────────────────
router.post(
  "/register",
  authLimiter,
  [
    check("email",    "Valid email is required").isEmail(),
    check("username", "Username is required").notEmpty(),
    check("password", "Password must be ≥8 characters").isLength({ min: 8 }),
  ],
  wrap(async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) {
      res.status(400).json({ success: false, errors: errs.array() });
      return; // void
    }
    await authController.register(req, res, next);
    return;      // ensure void
  })
);

// ─── POST /api/auth/login ────────────────────────────────────────────────
router.post(
  "/login",
  authLimiter,
  [
    check("email",    "Valid email is required").isEmail(),
    check("password", "Password is required").notEmpty(),
  ],
  wrap(async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) {
      res.status(400).json({ success: false, errors: errs.array() });
      return;
    }
    await authController.login(req, res, next);
    return;
  })
);

// ─── POST /api/auth/refresh-token ───────────────────────────────────────
router.post(
  "/refresh-token",
  [ check("refreshToken", "Refresh token is required").notEmpty() ],
  wrap(async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) {
      res.status(400).json({ success: false, errors: errs.array() });
      return;
    }
    await authController.refreshToken(req, res, next);
    return;
  })
);

// ─── POST /api/auth/logout ───────────────────────────────────────────────
router.post(
  "/logout",
  wrap(async (req, res, next) => {
    await authController.logout(req, res, next);
    return;
  })
);

// ─── GET /api/auth/me ────────────────────────────────────────────────────
router.get(
  "/me",
  protect,
  wrap(async (req, res, next) => {
    await authController.getCurrentUser(req, res, next);
    return;
  })
);

export default router;
