import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import * as goalController from "../controllers/GoalController";
import * as userController from "../controllers/userController"; // Import for pinning goals
import authMiddleware from "../middleware/authMiddleware";
import checkSubscription from "../middleware/checkSubscription";
import rateLimit from "express-rate-limit";
import logger from "../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

/**
 * Rate limiter to prevent excessive requests to goal endpoints.
 */
const goalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // Limit to 30 requests per minute per IP
  message: "Too many requests, please try again later.",
});

/**
 * @route   POST /goal/create
 * @desc    Create a new goal (basic plan or higher)
 * @access  Private
 */
router.post(
  "/create",
  authMiddleware,
  checkSubscription("basic"),
  goalLimiter,
  [
    check("title", "Title is required").notEmpty(),
    check("description", "Description is required").notEmpty(),
    check("dueDate", "Invalid date format").optional().isISO8601(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.createGoal(req as any, res, next);
    } catch (error) {
      logger.error(`Error creating goal: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * @route   PUT /goal/:goalId/progress
 * @desc    Update goal progress
 * @access  Private
 */
router.put(
  "/:goalId/progress",
  authMiddleware,
  [check("progress", "Progress must be between 0 and 100").isInt({ min: 0, max: 100 })],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.updateGoalProgress(req as any, res, next);
    } catch (error) {
      logger.error(`Error updating goal progress: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * @route   PUT /goal/:goalId/complete
 * @desc    Mark a goal as complete
 * @access  Private
 */
router.put(
  "/:goalId/complete",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.completeGoal(req as any, res, next);
    } catch (error) {
      logger.error(`Error completing goal: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * @route   GET /goal/my-goals
 * @desc    Get user's personal goals
 * @access  Private
 */
router.get(
  "/my-goals",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.getUserGoals(req as any, res, next);
    } catch (error) {
      logger.error(`Error fetching user goals: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * @route   GET /goal/analytics
 * @desc    Get goal analytics (standard plan or higher)
 * @access  Private
 */
router.get(
  "/analytics",
  authMiddleware,
  checkSubscription("standard"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.getAnalytics(req as any, res, next);
    } catch (error) {
      logger.error(`Error fetching analytics: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * @route   POST /goal/reminders
 * @desc    Set reminders for a goal (standard plan or higher)
 * @access  Private
 */
router.post(
  "/reminders",
  authMiddleware,
  checkSubscription("standard"),
  [
    check("goalId", "Goal ID is required").notEmpty().isMongoId(),
    check("message", "Reminder message is required").notEmpty(),
    check("remindAt", "Invalid date-time format").isISO8601(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.setReminder(req as any, res, next);
    } catch (error) {
      logger.error(`Error setting reminder: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * @route   GET /goal/public
 * @desc    Get public goals (available to all users)
 * @access  Public
 */
router.get(
  "/public",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.getPublicGoals(req, res, next);
    } catch (error) {
      logger.error(`Error fetching public goals: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * @route   POST /goal/:goalId/pin
 * @desc    Pin a goal to the user's profile
 * @access  Private
 */
router.post(
  "/:goalId/pin",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await userController.pinGoal(req as any, res, next);
    } catch (error) {
      logger.error(`Error pinning goal: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * @route   DELETE /goal/:goalId/unpin
 * @desc    Unpin a goal from the user's profile
 * @access  Private
 */
router.delete(
  "/:goalId/unpin",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await userController.unpinGoal(req as any, res, next);
    } catch (error) {
      logger.error(`Error unpinning goal: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * @route   POST /goal/feature-achievement
 * @desc    Feature an achievement on the user's profile
 * @access  Private
 */
router.post(
  "/feature-achievement",
  authMiddleware,
  [
    check("achievementId", "Achievement ID is required").notEmpty().isMongoId(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await userController.featureAchievement(req as any, res, next);
    } catch (error) {
      logger.error(`Error featuring achievement: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

/**
 * @route   DELETE /goal/unfeature-achievement
 * @desc    Unfeature an achievement from the user's profile
 * @access  Private
 */
router.delete(
  "/unfeature-achievement",
  authMiddleware,
  [
    check("achievementId", "Achievement ID is required").notEmpty().isMongoId(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await userController.unfeatureAchievement(req as any, res, next);
    } catch (error) {
      logger.error(`Error unfeaturing achievement: ${(error as Error).message}`, { error });
      next(error);
    }
  }
);

export default router;
