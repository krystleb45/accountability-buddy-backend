import { Router } from "express";
import express from "express";
import { protect } from "../middleware/authMiddleware"; // ✅ Updated import
import checkSubscription from "../middleware/checkSubscription";
import goalController from "../controllers/GoalController"; // ✅ Hooked in controller methods

const router: Router = express.Router();

/**
 * @route   POST /api/goals/create
 * @desc    Create a new goal (Requires Active Subscription)
 * @access  Private
 */
router.post(
  "/create",
  protect, // ✅ Use 'protect' here
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
  protect, // ✅ Use 'protect' here
  goalController.updateGoalProgress
);

/**
 * @route   PUT /api/goals/:goalId/complete
 * @desc    Mark goal as complete (triggers streak logic)
 * @access  Private
 */
router.put(
  "/:goalId/complete",
  protect, // ✅ Use 'protect' here
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
router.get("/my-goals", protect, goalController.getUserGoals); // ✅ Use 'protect' here

/**
 * @route   GET /api/goals/streak-dates
 * @desc    Get all goal completion dates for a user (for streak calendar heatmap)
 * @access  Private
 */
router.get("/streak-dates", protect, goalController.getStreakDates); // ✅ Use 'protect' here

export default router;
