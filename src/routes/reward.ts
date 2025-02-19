import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import authMiddleware from "../middleware/authMiddleware"; // Correct middleware import path
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl"; // Corrected RBAC middleware import path
import * as RewardController from "../controllers/RewardController"; // Corrected controller import path
import rateLimit from "express-rate-limit";
import logger from "../utils/winstonLogger"; // Logger utility
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path


const router: Router = express.Router();



/**
 * Rate limiter to prevent abuse.
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 requests per IP
  message: "Too many requests. Please try again later.",
});

/**
 * @route   GET /rewards
 * @desc    Get user rewards
 * @access  Private
 */
router.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await RewardController.getUserRewards(req, res, next);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error fetching rewards for user ${req.user?.id}: ${errorMessage}`);
      next(error);
    }
  },
);

/**
 * @route   POST /rewards/redeem
 * @desc    Redeem a reward
 * @access  Private
 */
router.post(
  "/redeem",
  authMiddleware,
  rateLimiter,
  [check("rewardId").notEmpty().withMessage("Reward ID is required.")],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await RewardController.redeemReward(req, res, next);

      res.status(200).json({
        success: true,
        message: "Reward redeemed successfully.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error redeeming reward for user ${req.user?.id}: ${errorMessage}`);
      next(error);
    }
  },
);

/**
 * @route   POST /rewards/create
 * @desc    Create a new reward (Admin only)
 * @access  Private (Admin only)
 */
router.post(
  "/create",
  authMiddleware,
  roleBasedAccessControl(["admin"]),
  [
    check("title").notEmpty().withMessage("Title is required."),
    check("description")
      .optional()
      .isString()
      .withMessage("Description must be a string."),
    check("points")
      .isNumeric()
      .withMessage("Points must be a numeric value."),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await RewardController.createReward(req, res, next);

      res.status(201).json({
        success: true,
        message: "Reward created successfully.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error creating reward: ${errorMessage}`);
      next(error);
    }
  },
);

export default router;
