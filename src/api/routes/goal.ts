// src/api/routes/goalRoutes.ts - Updated with subscription restrictions
import { Router } from "express";
import { protect } from "../middleware/authJwt";
import { validateSubscription, validateGoalLimit, trialPrompt } from "../middleware/subscriptionValidation";
import * as goalController from "../controllers/GoalController";

const router = Router();

// Apply authentication to all routes
router.use(protect);

/**
 * GET /api/goals
 * Get all of the current user's goals
 * Basic subscription required
 */
router.get("/", validateSubscription, goalController.getUserGoals);

/**
 * POST /api/goals
 * Create a new goal
 * Requires subscription + goal limit validation
 */
router.post("/", validateSubscription, validateGoalLimit, goalController.createGoal);

/**
 * GET /api/goals/public
 * List goals that are publicly visible
 * No subscription required (public feature)
 */
router.get("/public", goalController.getPublicGoals);

/**
 * GET /api/goals/my-goals
 * Alias for GET /api/goals (current user's)
 * Basic subscription required
 */
router.get("/my-goals", validateSubscription, goalController.getUserGoals);

/**
 * GET /api/goals/streak-dates
 * Get the user's streak dates for goals
 * Basic subscription required + trial prompt for analytics
 */
router.get("/streak-dates", validateSubscription, trialPrompt("streak-analytics"), goalController.getStreakDates);

/**
 * Routes for a specific goal by ID
 * All require subscription
 */
router
  .route("/:goalId")
  .get(validateSubscription, goalController.getGoalById)
  .put(validateSubscription, goalController.updateGoal)      // Edit/update title, description, etc.
  .delete(validateSubscription, goalController.deleteGoal); // Delete the goal

/**
 * PUT /api/goals/:goalId/progress
 * Update progress on one of the user's goals
 * Basic subscription required
 */
router.put("/:goalId/progress", validateSubscription, goalController.updateGoalProgress);

/**
 * PUT /api/goals/:goalId/complete
 * Mark a goal as complete
 * Basic subscription required
 */
router.put("/:goalId/complete", validateSubscription, goalController.completeGoal);

export default router;
