import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import authMiddleware from "../middleware/authMiddleware";
import checkSubscription from "../middleware/checkSubscription";
import { logger } from "../utils/winstonLogger"; // ✅ Logging for debugging

const router: Router = express.Router();

/**
 * @route   POST /api/goals/create
 * @desc    Create a new goal (requires active subscription)
 * @access  Private
 */
router.post("/create", authMiddleware, checkSubscription, async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info(`✅ Goal created by user: ${req.user?.id}`);
    res.status(201).json({ success: true, message: "Goal created successfully!" });
  } catch (error) {
    logger.error(`❌ Error creating goal: ${(error as Error).message}`);
    next(error);
  }
});

/**
 * @route   GET /api/goals/public
 * @desc    Get public goals (available to all users)
 * @access  Public
 */
router.get("/public", async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info("✅ Public goals retrieved.");
    res.status(200).json({ success: true, message: "Public goals retrieved!" });
  } catch (error) {
    logger.error(`❌ Error fetching public goals: ${(error as Error).message}`);
    next(error);
  }
});

export default router;
