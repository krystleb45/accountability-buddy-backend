import type { Request, Response, NextFunction, Router } from "express";
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

const handleRouteErrors =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction): void => {
      handler(req, res, next).catch((error) => {
        logger.error(`Error occurred: ${(error as Error).message}`);
        next(error);
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
  handleRouteErrors(async (req: Request, res: Response, next: NextFunction) => {
    const analytics = goalAnalyticsController.getUserGoalAnalytics(req, res, next);
    res.json({ success: true, data: analytics });
  }),
);

/**
 * @swagger
 * /api/analytics/goals/{id}:
 *   get:
 *     summary: Get analytics for a specific goal by ID
 *     tags: [GoalAnalytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
  "/goals/:id",
  [
    protect,
    check("id", "Goal ID is invalid").isMongoId(),
  ],
  handleRouteErrors(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { goalId } = req.params;
    if (!goalId) {
      res.status(400).json({ success: false, errors: ["Goal ID is required"] });
      return;
    }

    const analytics = goalAnalyticsController.getGoalAnalyticsById(
      { params: { goalId } } as Request<{ goalId: string }>,
      res,
      next,
    );
    res.json({ success: true, data: analytics });
  }),
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
  [
    protect,
    query("startDate")
      .notEmpty()
      .withMessage("Start date is required")
      .isISO8601()
      .withMessage("Invalid start date format")
      .toDate(),
    query("endDate")
      .notEmpty()
      .withMessage("End date is required")
      .isISO8601()
      .withMessage("Invalid end date format")
      .toDate(),
  ],
  handleRouteErrors(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
  
    await goalAnalyticsController.getGoalAnalyticsByDateRange(
      req as Request<{ goalId: string }, any, any, { startDate: string; endDate: string }>,
      res,
      next,
    );
  }),
  
);

export default router;
