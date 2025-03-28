import { Router } from "express";
import express from "express";
import authMiddleware from "../middleware/authMiddleware";
import checkSubscription from "../../middleware/checkSubscription";
import goalController from "../controllers/goalController"; // ✅ Hooked in controller methods

const router: Router = express.Router();

/**
 * @route   POST /api/goals/create
 * @desc    Create a new goal (Requires Active Subscription)
 * @access  Private
 */
router.post(
  "/create",
  authMiddleware,
  checkSubscription("paid"),
  goalController.createGoal
);

/**
 * @route   PUT /api/goals/:goalId/progress
 * @desc    Update progress for a goal
 * @access  Private
 */
router.put(
  "/:goalId/progress",
  authMiddleware,
  goalController.updateGoalProgress
);

/**
 * @route   PUT /api/goals/:goalId/complete
 * @desc    Mark goal as complete (triggers streak logic)
 * @access  Private
 */
router.put(
  "/:goalId/complete",
  authMiddleware,
  goalController.completeGoal
);

/**
 * @route   GET /api/goals/public
 * @desc    Get public goals (Available to All Users)
 * @access  Public
 */
router.get("/public", goalController.getPublicGoals);

/**
 * @route   GET /api/goals/my-goals
 * @desc    Get logged-in user's goals
 * @access  Private
 */
router.get("/my-goals", authMiddleware, goalController.getUserGoals);

/**
 * @route   GET /api/goals/streak-dates
 * @desc    Get all goal completion dates for a user (for streak calendar heatmap)
 * @access  Private
 */
router.get("/streak-dates", authMiddleware, goalController.getStreakDates);

export default router;
