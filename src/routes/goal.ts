import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import authMiddleware from "../middleware/authMiddleware";
import checkSubscription from "../middleware/checkSubscription"; // ✅ Ensure it's used correctly
import { logger } from "../utils/winstonLogger"; 

const router: Router = express.Router();

/**
 * @route   POST /api/goals/create
 * @desc    Create a new goal (Requires Active Subscription)
 * @access  Private
 */
router.post(
  "/create",
  authMiddleware,
  checkSubscription("paid"), // ✅ Corrected usage (CALL the function)
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info(`✅ Goal created by user: ${req.user?.id}`);
      res.status(201).json({ success: true, message: "Goal created successfully!" });
    } catch (error) {
      logger.error(`❌ Error creating goal: ${(error as Error).message}`);
      next(error);
    }
  }
);

/**
 * @route   GET /api/goals/public
 * @desc    Get public goals (Available to All Users)
 * @access  Public
 */
router.get(
  "/public",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info("✅ Public goals retrieved.");
      res.status(200).json({ success: true, message: "Public goals retrieved!" });
    } catch (error) {
      logger.error(`❌ Error fetching public goals: ${(error as Error).message}`);
      next(error);
    }
  }
);

export default router;
