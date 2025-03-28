import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../api/middleware/authMiddleware";
import * as AchievementController from "../controllers/AchievementController"; // ✅ Fixed import typo
import mongoose from "mongoose";

// Explicitly define the router type
const router: Router = express.Router();

// ✅ Configure rate limiter for request throttling
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// ✅ Middleware for validating required fields in the request body
const validateBody =
  (fields: string[]) =>
    (req: Request, res: Response, next: NextFunction): void => {
      const missingFields = fields.filter((field) => !req.body[field]);

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
        return;
      }

      next();
    };

/**
 * @desc Get all achievements for a user
 * @route GET /api/achievements
 * @access Private
 */
router.get("/", authMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await AchievementController.getAllAchievements(req, res, next);
  } catch (error) {
    next(error); // Delegate errors to middleware
  }
});

/**
 * @desc Add a new achievement
 * @route POST /api/achievements/add
 * @access Private
 */
router.post(
  "/add",
  authMiddleware,
  rateLimiter,
  validateBody(["name", "description", "requirements"]),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await AchievementController.addAchievement(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @desc Delete an achievement by ID
 * @route DELETE /api/achievements/:id
 * @access Private
 */
router.delete(
  "/:id",
  authMiddleware,
  async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid achievement ID format.",
        });
        return;
      }

      await AchievementController.deleteAchievement(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @desc Get leaderboard achievements (Admin only)
 * @route GET /api/achievements/leaderboard
 * @access Private/Admin
 */
router.get("/leaderboard", authMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await AchievementController.getLeaderboardAchievements(req, res, next);
  } catch (error) {
    next(error);
  }
});

// ✅ Export the router
export default router;
