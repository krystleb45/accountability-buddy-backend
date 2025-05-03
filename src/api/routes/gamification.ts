// src/api/routes/gamification.ts
import { Router, Request, Response, NextFunction } from "express";
import { query, check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import gamificationController from "../controllers/gamificationController";

const router = Router();

// throttle to 10 requests per minute
const leaderboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests, please try again later." },
});

/**
 * GET /api/gamification/leaderboard
 * Get the leaderboard
 */
router.get(
  "/leaderboard",
  protect,
  leaderboardLimiter,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  handleValidationErrors,
  // Wrap in an async function so it returns Promise<void>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await gamificationController.getLeaderboard(req, res, next);
  }
);

// throttle to 10 requests per 15 minutes
const addPointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests, please try again later." },
});

/**
 * POST /api/gamification/add-points
 * Add points to a user's gamification profile
 */
router.post(
  "/add-points",
  protect,
  addPointsLimiter,
  [
    check("userId", "User ID is required and must be a valid Mongo ID")
      .notEmpty()
      .isMongoId(),
    check("points", "Points must be a positive integer").isInt({ min: 1 }),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await gamificationController.addPoints(req, res, next);
  }
);

export default router;
