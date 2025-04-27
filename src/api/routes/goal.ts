import { Router } from "express";
import express from "express";
import { protect } from "../middleware/authMiddleware";
import checkSubscription from "../middleware/checkSubscription";
import * as goalController from "../controllers/GoalController";
const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Goals
 *   description: Endpoints for managing user goals
 */

/**
 * @swagger
 * /api/goals/create:
 *   post:
 *     summary: Create a new goal
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     description: Create a goal for a logged-in user with an active paid subscription.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - target
 *             properties:
 *               title:
 *                 type: string
 *               target:
 *                 type: number
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Goal created successfully
 *       401:
 *         description: Unauthorized or inactive subscription
 */
router.post("/create", protect, checkSubscription("paid"), goalController.createGoal);

/**
 * @swagger
 * /api/goals/{goalId}/progress:
 *   put:
 *     summary: Update goal progress
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the goal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               progress:
 *                 type: number
 *     responses:
 *       200:
 *         description: Goal progress updated
 *       404:
 *         description: Goal not found
 */
router.put("/:goalId/progress", protect, goalController.updateGoalProgress);

/**
 * @swagger
 * /api/goals/{goalId}/complete:
 *   put:
 *     summary: Mark a goal as complete
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the goal
 *     responses:
 *       200:
 *         description: Goal marked as complete
 *       404:
 *         description: Goal not found
 */
router.put("/:goalId/complete", protect, goalController.completeGoal);

/**
 * @swagger
 * /api/goals/public:
 *   get:
 *     summary: Get all public goals
 *     tags: [Goals]
 *     description: Retrieve goals marked as public by users.
 *     responses:
 *       200:
 *         description: List of public goals
 */
router.get("/public", goalController.getPublicGoals);

/**
 * @swagger
 * /api/goals/my-goals:
 *   get:
 *     summary: Get user-specific goals
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     description: Get all goals created by the logged-in user.
 *     responses:
 *       200:
 *         description: List of user goals
 */
router.get("/my-goals", protect, goalController.getUserGoals);

/**
 * @swagger
 * /api/goals/streak-dates:
 *   get:
 *     summary: Get goal completion streak dates
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     description: Get all dates where the user completed goals (used for streak visualizations).
 *     responses:
 *       200:
 *         description: Streak dates returned
 */
router.get("/streak-dates", protect, goalController.getStreakDates);

export default router;
