import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check, query } from "express-validator";
import Gamification from "../models/Gamification";
import { protect } from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";
import { logger } from "../../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

/**
 * Rate limiter to prevent excessive requests to the leaderboard
 */
const leaderboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many requests, please try again later",
});

/**
 * @swagger
 * /gamification/leaderboard:
 *   get:
 *     summary: Get the leaderboard
 *     tags: [Gamification]
 *     description: Retrieves a paginated leaderboard sorted by level and points.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number (default is 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of results per page (default is 10)
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/leaderboard",
  protect,
  leaderboardLimiter,
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    try {
      const leaderboard = await Gamification.find()
        .sort({ level: -1, points: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("userId", "name email");

      const totalUsers = await Gamification.countDocuments();

      res.status(200).json({
        success: true,
        data: leaderboard,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
        },
      });
    } catch (error) {
      logger.error(`Error fetching leaderboard: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * Rate limiter for adding points
 */
const addPointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});

/**
 * @swagger
 * /gamification/add-points:
 *   post:
 *     summary: Add points to a user's gamification profile
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - points
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109ca"
 *               points:
 *                 type: integer
 *                 example: 100
 *     responses:
 *       200:
 *         description: Points added successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/add-points",
  protect,
  addPointsLimiter,
  [
    check("userId", "User ID is required and must be valid").notEmpty().isMongoId(),
    check("points", "Points must be a positive integer").isInt({ min: 1 }),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { userId, points } = req.body;

    try {
      const userGamification = await Gamification.findOne({ userId });

      if (!userGamification) {
        res.status(404).json({
          success: false,
          message: "User not found in gamification system",
        });
        return;
      }

      await userGamification.addPoints(points);

      res.status(200).json({
        success: true,
        message: `Added ${points} points to user ${userId}`,
      });
    } catch (error) {
      logger.error(`Error adding points: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

export default router;
