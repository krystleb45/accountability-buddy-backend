import type { Router, Response } from "express";
import express from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
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
  featureAchievement,
  unfeatureAchievement,
  getUserStatistics,
} from "../controllers/userController";
import { getLeaderboard } from "../controllers/LeaderboardController";
import { logger } from "../../utils/winstonLogger";

const router: Router = express.Router();

const sensitiveOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many requests. Please try again later.",
});

const handleError = (error: unknown, res: Response, defaultMessage: string): void => {
  const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
  logger.error(`${defaultMessage}: ${errorMessage}`);
  res.status(500).json({ success: false, message: defaultMessage, error: errorMessage });
};

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and settings operations
 */

/**
 * @swagger
 * /user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 */
router.get("/profile", protect as any, getUserProfile);

/**
 * @swagger
 * /user/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: User profile updated
 */
router.put(
  "/profile",
  protect as any,
  [check("email").optional().isEmail(), check("username").optional().notEmpty()],
  updateUserProfile
);

/**
 * @swagger
 * /user/password:
 *   patch:
 *     summary: Change password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 */
router.patch(
  "/password",
  protect as any,
  sensitiveOperationLimiter,
  [
    check("currentPassword").notEmpty(),
    check("newPassword").isLength({ min: 8 }),
  ],
  changePassword
);

/**
 * @swagger
 * /user/account:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.delete("/account", protect as any, sensitiveOperationLimiter, async (req, res, next) => {
  try {
    await deleteUserAccount(req, res, next);
  } catch (error) {
    handleError(error, res, "Error deleting user account");
  }
});

/**
 * @swagger
 * /user/pin-goal:
 *   post:
 *     summary: Pin a goal
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post("/pin-goal", protect as any, pinGoal);

/**
 * @swagger
 * /user/unpin-goal:
 *   delete:
 *     summary: Unpin a goal
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/unpin-goal", protect as any, unpinGoal);

/**
 * @swagger
 * /user/pinned-goals:
 *   get:
 *     summary: Get pinned goals
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get("/pinned-goals", protect as any, getPinnedGoals);

/**
 * @swagger
 * /user/feature-achievement:
 *   post:
 *     summary: Feature an achievement
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post("/feature-achievement", protect as any, featureAchievement);

/**
 * @swagger
 * /user/unfeature-achievement:
 *   delete:
 *     summary: Unfeature an achievement
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/unfeature-achievement", protect as any, unfeatureAchievement);

/**
 * @swagger
 * /user/featured-achievements:
 *   get:
 *     summary: Get featured achievements
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get("/featured-achievements", protect as any, getFeaturedAchievements);

/**
 * @swagger
 * /user/leaderboard:
 *   get:
 *     summary: Get user leaderboard
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Leaderboard returned
 */
router.get("/leaderboard", getLeaderboard);

/**
 * @swagger
 * /user/{userId}/statistics:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User statistics returned
 */
router.get("/:userId/statistics", protect as any, getUserStatistics);

export default router;
