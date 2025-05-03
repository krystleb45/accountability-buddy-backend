// src/api/routes/goal.ts
import { Router, Request, Response, NextFunction } from "express";
import { protect } from "../middleware/authMiddleware";
import checkSubscription from "../middleware/checkSubscription";
import * as goalController from "../controllers/GoalController";

const router = Router();

/**
 * POST /api/goals/create
 */
router.post(
  "/create",
  protect,
  checkSubscription("paid"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.createGoal(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/goals/:goalId/progress
 */
router.put(
  "/:goalId/progress",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.updateGoalProgress(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/goals/:goalId/complete
 */
router.put(
  "/:goalId/complete",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.completeGoal(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/goals/public
 */
router.get(
  "/public",
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.getPublicGoals(_req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/goals/my-goals
 */
router.get(
  "/my-goals",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.getUserGoals(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/goals/streak-dates
 */
router.get(
  "/streak-dates",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await goalController.getStreakDates(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
