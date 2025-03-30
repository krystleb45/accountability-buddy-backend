import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import { getUserStreak, logDailyCheckIn, getStreakLeaderboard } from "../controllers/StreakController"; // Named imports from StreakController
import { protect } from "../middleware/authMiddleware"; // Protect middleware for authentication
import rateLimit from "express-rate-limit"; // To avoid too many requests

const router: Router = express.Router();

// Rate limiter to prevent spam check-ins
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 requests per IP address within 15 minutes
  message: "Too many requests. Please try again later.",
});

/**
 * @route   GET /api/streaks
 * @desc    Get user's current streak and check-in history
 * @access  Private
 */
router.get(
  "/",
  protect, // Ensure user is authenticated
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await getUserStreak(req, res, next); // Use named import from StreakController
      // No need to return res, as the controller handles it internally
    } catch (error) {
      next(error); // Pass error to the next middleware
    }
  }
);

/**
 * @route   POST /api/streaks/check-in
 * @desc    Log a daily check-in to increment streak
 * @access  Private
 */
router.post(
  "/check-in",
  protect, // Ensure user is authenticated
  rateLimiter, // Limit the number of check-ins
  [
    check("date", "Date is required").optional().isISO8601().toDate(),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Handle validation errors without returning a Response object
        res.status(400).json({ errors: errors.array() });
        return; // Early return after sending the response
      }

      // Call check-in logic from the streak controller
      await logDailyCheckIn(req, res, next); // Use named import from StreakController
      // No need to return res, as the controller handles it internally
    } catch (error) {
      next(error); // Pass error to the next middleware
    }
  }
);

/**
 * @route   GET /api/streaks/leaderboard
 * @desc    Get the streak leaderboard (top users based on streak count)
 * @access  Private
 */
router.get(
  "/leaderboard",
  protect, // Ensure user is authenticated
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await getStreakLeaderboard(req, res, next); // Use named import from StreakController
      // No need to return res, as the controller handles it internally
    } catch (error) {
      next(error); // Pass error to the next middleware
    }
  }
);

export default router;
