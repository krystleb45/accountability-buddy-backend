import type { Response, NextFunction, Router, Request } from "express";
import express from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import * as badgeController from "../controllers/BadgeController";
import { protect } from "../middleware/authMiddleware"; // Corrected import to use named export `protect`
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import { logger } from "../../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

// ✅ Middleware to ensure only admins can access specific routes
const adminMiddleware = roleBasedAccessControl(["admin"]);

// ✅ Rate limiter to prevent abuse of badge routes
const badgeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: "Too many requests, please try again later.",
});

// ✅ Apply rate limiter to all badge routes
router.use(badgeRateLimiter);

// ✅ Middleware for input validation
const validateBadgeData = [
  check("userId").optional().isMongoId().withMessage("Invalid User ID"),
  check("badgeType").notEmpty().withMessage("Badge type is required"),
  check("level")
    .optional()
    .isIn(["Bronze", "Silver", "Gold"])
    .withMessage("Invalid badge level"),
  check("increment")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Increment must be a positive integer"),
];

/**
 * Utility function to handle route errors
 */
const handleRouteErrors = (
  handler: (req: Request, res: Response, next: NextFunction) => void
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      handler(req, res, next);
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
  handleRouteErrors(badgeController.getUserBadges as (req: Request, res: Response, next: NextFunction) => Promise<void>)
);

/**
 * @route   GET /api/badges/showcase
 * @desc    Get showcased badges for the logged-in user
 * @access  Private
 */
router.get(
  "/showcase",
  protect,
  handleRouteErrors(badgeController.getUserBadgeShowcase)
);

/**
 * @route   POST /api/badges/award
 * @desc    Award a badge to a user
 * @access  Private (Admin only)
 */
router.post(
  "/award",
  [protect, adminMiddleware, ...validateBadgeData, handleValidationErrors],
  handleRouteErrors(badgeController.awardBadge)
);

/**
 * @route   POST /api/badges/progress/update
 * @desc    Update badge progress for the logged-in user
 * @access  Private
 */
router.post(
  "/progress/update",
  [protect, ...validateBadgeData, handleValidationErrors],
  handleRouteErrors(badgeController.updateBadgeProgress)
);

/**
 * @route   POST /api/badges/upgrade
 * @desc    Upgrade a badge level for the logged-in user
 * @access  Private
 */
router.post(
  "/upgrade",
  [protect, ...validateBadgeData, handleValidationErrors],
  handleRouteErrors(badgeController.upgradeBadgeLevel)
);

/**
 * @route   DELETE /api/badges/expired/remove
 * @desc    Remove expired badges for a user
 * @access  Private (Admin only)
 */
router.delete(
  "/expired/remove",
  [protect, adminMiddleware],
  handleRouteErrors(badgeController.removeExpiredBadges)
);

// ✅ Export the router
export default router;
