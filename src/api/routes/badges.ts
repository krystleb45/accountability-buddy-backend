import express, { Router, Request, Response, NextFunction } from "express"; // Importing express and relevant types
import { check } from "express-validator";
import { protect, restrictTo } from "../middleware/authMiddleware"; // Ensure proper middleware import
import * as BadgeController from "../controllers/BadgeController"; // Corrected controller import path
import rateLimit from "express-rate-limit";
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path if necessary
import { logger } from "../../utils/winstonLogger"; // Assuming you have a logging utility

const router: Router = express.Router();

// ✅ Rate limiter for badge operations (apply it to relevant routes)
const badgeOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 requests per IP
  message: "Too many requests. Please try again later.",
});

/**
 * @route   POST /api/badges/award
 * @desc    Award a badge to a user
 * @access  Private (Admin only)
 */
router.post(
  "/award",
  protect,
  restrictTo("admin"),
  badgeOperationLimiter, // Apply rate limiting here
  [
    check("userId").notEmpty().withMessage("User ID is required."),
    check("badgeType").notEmpty().withMessage("Badge Type is required."),
    check("level").optional().isString().withMessage("Badge Level must be a string."),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await BadgeController.awardBadge(req, res, next);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error awarding badge: ${errorMessage}`);
      next(error);
    }
  }
);

/**
 * @route   POST /api/badges/progress/update
 * @desc    Update the badge progress for a user
 * @access  Private
 */
router.post(
  "/progress/update",
  protect,
  badgeOperationLimiter, // Apply rate limiting here
  [
    check("badgeType").notEmpty().withMessage("Badge Type is required."),
    check("increment").isNumeric().withMessage("Increment must be a number."),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await BadgeController.updateBadgeProgress(req, res, next);
      res.status(200).json({ success: true, message: "Badge progress updated." });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error updating badge progress: ${errorMessage}`);
      next(error);
    }
  }
);

/**
 * @route   GET /api/badges
 * @desc    Get all badges for the current user
 * @access  Private
 */
router.get(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await BadgeController.getUserBadges(req, res, next);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error fetching badges for user ${req.user?.id}: ${errorMessage}`);
      next(error);
    }
  }
);

/**
 * @route   GET /api/badges/showcase
 * @desc    Get all badges showcased by the user
 * @access  Private
 */
router.get(
  "/showcase",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await BadgeController.getUserBadgeShowcase(req, res, next);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error fetching badge showcase for user ${req.user?.id}: ${errorMessage}`);
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/badges/expired/remove
 * @desc    Remove expired badges (Admin only)
 * @access  Private (Admin only)
 */
router.delete(
  "/expired/remove",
  protect,
  restrictTo("admin"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await BadgeController.removeExpiredBadges(req, res, next);
      res.status(200).json({ success: true, message: "Expired badges removed." });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error removing expired badges: ${errorMessage}`);
      next(error);
    }
  }
);

export default router;
