// src/api/routes/goalAnalytics.ts
import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check, query, validationResult } from "express-validator";
import goalAnalyticsController from "../controllers/goalAnalyticsController";
import { protect } from "../middleware/authMiddleware";
import { logger } from "../../utils/winstonLogger";

const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: GoalAnalytics
 *   description: Endpoints for tracking and analyzing user goals
 */

// A small helper to catch promise rejections from async handlers
const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction): void => {
      fn(req, res, next).catch((err) => {
        logger.error(`Error in GoalAnalytics route: ${(err as Error).message}`);
        next(err);
      });
    };

/**
 * @swagger
 * /api/analytics/goals:
 *   get:
 *     summary: Get overall analytics for user goals
 *     tags: [GoalAnalytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data for all user goals
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/goals",
  protect,
  wrap(async (req, res, next) => {
    // Controller will call sendResponse internally
    await goalAnalyticsController.getUserGoalAnalytics(req, res, next);
  })
);

/**
 * @swagger
 * /api/analytics/goals/{goalId}:
 *   get:
 *     summary: Get analytics for a specific goal by ID
 *     tags: [GoalAnalytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the goal
 *     responses:
 *       200:
 *         description: Analytics data for the specified goal
 *       400:
 *         description: Invalid goal ID
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/goals/:goalId",
  protect,
  check("goalId", "Goal ID is invalid").isMongoId(),
  wrap(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // early return on validation failure
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    await goalAnalyticsController.getGoalAnalyticsById(req, res, next);
  })
);

/**
 * @swagger
 * /api/analytics/goals/date-range:
 *   get:
 *     summary: Get goal analytics filtered by date range
 *     tags: [GoalAnalytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (ISO 8601)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (ISO 8601)
 *     responses:
 *       200:
 *         description: Analytics data within the specified date range
 *       400:
 *         description: Validation errors
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/goals/date-range",
  protect,
  query("startDate").notEmpty().isISO8601().withMessage("Invalid start date").toDate(),
  query("endDate").notEmpty().isISO8601().withMessage("Invalid end date").toDate(),
  wrap(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    await goalAnalyticsController.getGoalAnalyticsByDateRange(req, res, next);
  })
);

export default router;
