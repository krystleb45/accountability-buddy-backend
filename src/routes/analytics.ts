import type { Request, Response, NextFunction, Router  } from "express";
import express from "express";
import { check, query, validationResult } from "express-validator";
import goalAnalyticsController from "../controllers/goalAnalyticsController";
import authMiddleware from "../middleware/authMiddleware";
import logger from "../utils/winstonLogger";

const router: Router = express.Router();

/**
 * Utility function to handle route errors consistently
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
 * @route   GET /api/analytics/goals
 * @desc    Get general goal analytics
 * @access  Private
 */
router.get(
  "/goals",
  authMiddleware,
  handleRouteErrors(async (req: Request, res: Response, next: NextFunction) => {
    const analytics = goalAnalyticsController.getUserGoalAnalytics(
      req,
      res,
      next,
    );
    res.json({ success: true, data: analytics });
  }),
);

/**
 * @route   GET /api/analytics/goals/:id
 * @desc    Get analytics for a specific goal by ID
 * @access  Private
 */
router.get(
  "/goals/:id",
  [
    authMiddleware,
    check("id", "Goal ID is invalid").isMongoId(), // Validate the goal ID format
  ],

  handleRouteErrors(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
      res.status(400).json({ success: false, errors: errors.array() });
      return; // Explicit return to avoid further execution
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
 * @route   GET /api/analytics/goals/date-range
 * @desc    Get analytics for goals by date range
 * @access  Private
 */
router.get(
  "/goals/date-range",
  [
    authMiddleware,
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

    
    goalAnalyticsController.getGoalAnalyticsByDateRange(
      req as Request<{ goalId: string }, any, any, { startDate: string; endDate: string }>,
      res,
      next,
    );
  }),
);
export default router;
