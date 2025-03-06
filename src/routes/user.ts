import type { Router, Response } from "express";
import express from "express";
import { check } from "express-validator";
import authMiddleware from "../middleware/authMiddleware"; // ✅ Ensure proper middleware import
import rateLimit from "express-rate-limit";
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  deleteUserAccount,
  pinGoal,
  unpinGoal,
  getPinnedGoals,
  getFeaturedAchievements,
  featureAchievement, // ✅ Ensure this exists in userController.ts
  unfeatureAchievement, // ✅ Ensure this exists in userController.ts
} from "../controllers/userController";
import { logger } from "../utils/winstonLogger";

// ✅ Initialize router
const router: Router = express.Router();

// ✅ Rate limiter for sensitive operations
const sensitiveOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: "Too many requests. Please try again later.",
});

/**
 * ✅ Utility for consistent error handling.
 */
const handleError = (
  error: unknown,
  res: Response,
  defaultMessage: string
): void => {
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  logger.error(`${defaultMessage}: ${errorMessage}`);
  res.status(500).json({ success: false, message: defaultMessage, error: errorMessage });
};

/**
 * ✅ @route   GET /user/profile
 * ✅ @desc    Get the user's profile
 * ✅ @access  Private
 */
router.get("/profile", authMiddleware, getUserProfile);

/**
 * ✅ @route   PUT /user/profile
 * ✅ @desc    Update the user's profile
 * ✅ @access  Private
 */
router.put(
  "/profile",
  authMiddleware,
  [
    check("email", "Invalid email").optional().isEmail(),
    check("username", "Username cannot be empty").optional().notEmpty(),
  ],
  updateUserProfile
);

/**
 * ✅ @route   PATCH /user/password
 * ✅ @desc    Change the user's password
 * ✅ @access  Private
 */
router.patch(
  "/password",
  authMiddleware,
  sensitiveOperationLimiter,
  [
    check("currentPassword", "Current password is required").notEmpty(),
    check("newPassword", "New password must be at least 8 characters").isLength({ min: 8 }),
  ],
  changePassword
);

/**
 * ✅ @route   DELETE /user/account
 * ✅ @desc    Delete the user's account
 * ✅ @access  Private
 */
router.delete("/account", authMiddleware, sensitiveOperationLimiter, async (req, res, next) => {
  try {
    await deleteUserAccount(req, res, next);
  } catch (error) {
    handleError(error, res, "Error deleting user account");
  }
});

/**
 * ✅ @route   POST /user/pin-goal
 * ✅ @desc    Pin a goal for the user
 * ✅ @access  Private
 */
router.post("/pin-goal", authMiddleware, pinGoal);

/**
 * ✅ @route   DELETE /user/unpin-goal
 * ✅ @desc    Unpin a goal for the user
 * ✅ @access  Private
 */
router.delete("/unpin-goal", authMiddleware, unpinGoal);

/**
 * ✅ @route   GET /user/pinned-goals
 * ✅ @desc    Get all pinned goals for a user
 * ✅ @access  Private
 */
router.get("/pinned-goals", authMiddleware, getPinnedGoals);

/**
 * ✅ @route   POST /user/feature-achievement
 * ✅ @desc    Feature an achievement for the user
 * ✅ @access  Private
 */
router.post("/feature-achievement", authMiddleware, featureAchievement);

/**
 * ✅ @route   DELETE /user/unfeature-achievement
 * ✅ @desc    Unfeature an achievement for the user
 * ✅ @access  Private
 */
router.delete("/unfeature-achievement", authMiddleware, unfeatureAchievement);

/**
 * ✅ @route   GET /user/featured-achievements
 * ✅ @desc    Get all featured achievements for a user
 * ✅ @access  Private
 */
router.get("/featured-achievements", authMiddleware, getFeaturedAchievements);

export default router;
