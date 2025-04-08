import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import { getUserStreak, logDailyCheckIn, getStreakLeaderboard } from "../controllers/StreakController";
import { protect } from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";

const router: Router = express.Router();

// Rate limiter
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many requests. Please try again later.",
});

/**
 * @swagger
 * tags:
 *   name: Streaks
 *   description: Endpoints for tracking and managing user streaks
 */

/**
 * @swagger
 * /api/streaks:
 *   get:
 *     summary: Get the user's current streak and check-in history
 *     tags: [Streaks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User streak retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await getUserStreak(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/streaks/check-in:
 *   post:
 *     summary: Log a daily check-in to increment user's streak
 *     tags: [Streaks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-04-08"
 *     responses:
 *       200:
 *         description: Check-in logged successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */
router.post(
  "/check-in",
  protect,
  rateLimiter,
  [check("date", "Date is required").optional().isISO8601().toDate()],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      await logDailyCheckIn(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/streaks/leaderboard:
 *   get:
 *     summary: Get the streak leaderboard
 *     tags: [Streaks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/leaderboard",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await getStreakLeaderboard(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
