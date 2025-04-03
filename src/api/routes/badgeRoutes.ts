import express, { Router, Request, Response, NextFunction } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import * as BadgeController from "../controllers/BadgeController";
import { protect, restrictTo } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import { logger } from "../../utils/winstonLogger";

const router: Router = express.Router();

// Global rate limiter for all badge routes
const badgeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: "Too many requests, please try again later.",
});

// Stricter rate limiter for critical operations (award, progress update)
const badgeOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window for critical operations
  message: "Too many requests. Please try again later.",
});

// Apply the global rate limiter to all badge routes
router.use(badgeRateLimiter);

/**
 * Utility function to wrap route handlers with error handling.
 * It now accepts handlers that return either void or Promise<void>.
 */
const handleRouteErrors = (
  handler: (req: Request, res: Response, next: NextFunction) => void | Promise<void>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await Promise.resolve(handler(req, res, next));
    } catch (error) {
      logger.error(`Error in badge route: ${(error as Error).message}`);
      next(error);
    }
  };
};

/**
 * @route   GET /api/badges
 * @desc    Get all badges for the logged-in user
 * @access  Private
 */
router.get(
  "/",
  protect,
  handleRouteErrors(BadgeController.getUserBadges)
);

/**
 * @route   GET /api/badges/showcase
 * @desc    Get showcased badges for the logged-in user
 * @access  Private
 */
router.get(
  "/showcase",
  protect,
  handleRouteErrors(BadgeController.getUserBadgeShowcase)
);

/**
 * @route   POST /api/badges/award
 * @desc    Award a badge to a user
 * @access  Private (Admin only)
 */
router.post(
  "/award",
  protect,
  restrictTo("admin"),
  badgeOperationLimiter,
  [
    check("userId")
      .notEmpty()
      .withMessage("User ID is required.")
      .bail()
      .isMongoId()
      .withMessage("Invalid User ID"),
    check("badgeType").notEmpty().withMessage("Badge type is required"),
    check("level")
      .optional()
      .isIn(["Bronze", "Silver", "Gold"])
      .withMessage("Invalid badge level"),
  ],
  handleValidationErrors,
  handleRouteErrors(BadgeController.awardBadge)
);

/**
 * @route   POST /api/badges/progress/update
 * @desc    Update the badge progress for the logged-in user
 * @access  Private
 */
router.post(
  "/progress/update",
  protect,
  badgeOperationLimiter,
  [
    check("badgeType").notEmpty().withMessage("Badge type is required"),
    check("increment")
      .notEmpty()
      .withMessage("Increment is required")
      .bail()
      .isInt({ min: 1 })
      .withMessage("Increment must be a positive integer"),
  ],
  handleValidationErrors,
  handleRouteErrors(BadgeController.updateBadgeProgress)
);

/**
 * @route   POST /api/badges/upgrade
 * @desc    Upgrade a badge level for the logged-in user
 * @access  Private
 */
router.post(
  "/upgrade",
  protect,
  [
    check("userId")
      .optional()
      .isMongoId()
      .withMessage("Invalid User ID"),
    check("badgeType").notEmpty().withMessage("Badge type is required"),
    check("level")
      .optional()
      .isIn(["Bronze", "Silver", "Gold"])
      .withMessage("Invalid badge level"),
    check("increment")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Increment must be a positive integer"),
  ],
  handleValidationErrors,
  handleRouteErrors(BadgeController.upgradeBadgeLevel)
);

/**
 * @route   DELETE /api/badges/expired/remove
 * @desc    Remove expired badges for a user
 * @access  Private (Admin only)
 */
router.delete(
  "/expired/remove",
  protect,
  restrictTo("admin"),
  handleRouteErrors(BadgeController.removeExpiredBadges)
);

export default router;
