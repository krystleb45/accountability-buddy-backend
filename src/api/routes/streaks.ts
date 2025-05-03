// src/api/routes/streaks.ts
import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";
import { check } from "express-validator";
import handleValidationErrors from "../middleware/handleValidationErrors";
import {
  getUserStreak,
  logDailyCheckIn,
  getStreakLeaderboard,
} from "../controllers/StreakController";

const router = Router();

// Throttle check-in requests to 5 per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many requests. Please try again later." },
});

/**
 * GET /api/streaks
 * Get the user's current streak and check-in history
 */
router.get(
  "/",
  protect,
  getUserStreak
);

/**
 * POST /api/streaks/check-in
 * Log a daily check-in to increment user's streak
 */
router.post(
  "/check-in",
  protect,
  limiter,
  [
    check("date")
      .optional()
      .isISO8601()
      .withMessage("Date must be in ISO8601 format"),
  ],
  handleValidationErrors,
  logDailyCheckIn
);

/**
 * GET /api/streaks/leaderboard
 * Get the streak leaderboard
 */
router.get(
  "/leaderboard",
  protect,
  getStreakLeaderboard
);

export default router;
