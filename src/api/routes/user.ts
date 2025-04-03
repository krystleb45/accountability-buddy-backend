import type { Router, Response, RequestHandler } from "express";
import express from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware"; // ✅ Corrected middleware import
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
import { logger } from "../../utils/winstonLogger";
import { getLeaderboard } from "../controllers/LeaderboardController"; // ✅ New
import { ParsedQs } from "qs";
import { ParamsDictionary } from "express-serve-static-core";
import { getUserStatistics } from "../controllers/userController";


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
router.get("/profile", protect as RequestHandler<ParamsDictionary, any, {}, ParsedQs, Record<string, any>>, getUserProfile); // ✅ Replaced authMiddleware with protect

/**
 * ✅ @route   PUT /user/profile
 * ✅ @desc    Update the user's profile
 * ✅ @access  Private
 */
router.put(
  "/profile",
  protect as RequestHandler<ParamsDictionary, any, {}, ParsedQs, Record<string, any>>, // ✅ Replaced authMiddleware with protect
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
  protect as RequestHandler<ParamsDictionary, any, {}, ParsedQs, Record<string, any>>, // ✅ Replaced authMiddleware with protect
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
router.delete("/account", protect as RequestHandler<ParamsDictionary, any, {}, ParsedQs, Record<string, any>>, sensitiveOperationLimiter, async (req, res, next) => {
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
router.post("/pin-goal", protect as RequestHandler<ParamsDictionary, any, {}, ParsedQs, Record<string, any>>, pinGoal); // ✅ Replaced authMiddleware with protect

/**
 * ✅ @route   DELETE /user/unpin-goal
 * ✅ @desc    Unpin a goal for the user
 * ✅ @access  Private
 */
router.delete("/unpin-goal", protect as RequestHandler<ParamsDictionary, any, {}, ParsedQs, Record<string, any>>, unpinGoal); // ✅ Replaced authMiddleware with protect

/**
 * ✅ @route   GET /user/pinned-goals
 * ✅ @desc    Get all pinned goals for a user
 * ✅ @access  Private
 */
router.get("/pinned-goals", protect as RequestHandler<ParamsDictionary, any, {}, ParsedQs, Record<string, any>>, getPinnedGoals); // ✅ Replaced authMiddleware with protect

/**
 * ✅ @route   POST /user/feature-achievement
 * ✅ @desc    Feature an achievement for the user
 * ✅ @access  Private
 */
router.post("/feature-achievement", protect as RequestHandler<ParamsDictionary, any, {}, ParsedQs, Record<string, any>>, featureAchievement);
/**
 * ✅ @route   DELETE /user/unfeature-achievement
 * ✅ @desc    Unfeature an achievement for the user
 * ✅ @access  Private
 */
router.delete("/unfeature-achievement", protect as RequestHandler<ParamsDictionary, any, {}, ParsedQs, Record<string, any>>, unfeatureAchievement); // ✅ Replaced authMiddleware with protect

/**
 * ✅ @route   GET /user/featured-achievements
 * ✅ @desc    Get all featured achievements for a user
 * ✅ @access  Private
 */
router.get("/featured-achievements", protect as RequestHandler<ParamsDictionary, any, {}, ParsedQs, Record<string, any>>, getFeaturedAchievements); // ✅ Replaced authMiddleware with protect

/**
 * ✅ @route   GET /user/leaderboard
 * ✅ @desc    Get the top users for leaderboard display
 * ✅ @access  Public
 */
router.get("/leaderboard", getLeaderboard);
/**
 * ✅ @route   GET /user/:userId/statistics
 * ✅ @desc    Get statistics for a specific user
 * ✅ @access  Private
 */
router.get("/:userId/statistics", protect as RequestHandler, getUserStatistics);

export default router;
