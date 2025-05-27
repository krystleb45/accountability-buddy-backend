// src/api/routes/goal.ts
import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import * as goalController from "../controllers/GoalController";

const router = Router();

// Apply authentication to all routes
router.use(protect);

/**
 * GET /api/goals
 * Get all of the current user's goals
 */
router.get("/", goalController.getUserGoals);

/**
 * POST /api/goals
 * Create a new goal
 */
router.post("/", goalController.createGoal);

/**
 * GET /api/goals/public
 * List goals that are publicly visible
 */
router.get("/public", goalController.getPublicGoals);

/**
 * GET /api/goals/my-goals
 * Alias for GET /api/goals (current user's)
 */
router.get("/my-goals", goalController.getUserGoals);

/**
 * GET /api/goals/streak-dates
 * Get the user's streak dates for goals
 */
router.get("/streak-dates", goalController.getStreakDates);

/**
 * Routes for a specific goal by ID
 */
router
  .route("/:goalId")
  .get(goalController.getGoalById)
  .put(goalController.updateGoal)      // Edit/update title, description, etc.
  .delete(goalController.deleteGoal); // Delete the goal

/**
 * PUT /api/goals/:goalId/progress
 * Update progress on one of the user's goals
 */
router.put("/:goalId/progress", goalController.updateGoalProgress);

/**
 * PUT /api/goals/:goalId/complete
 * Mark a goal as complete
 */
router.put("/:goalId/complete", goalController.completeGoal);

export default router;
