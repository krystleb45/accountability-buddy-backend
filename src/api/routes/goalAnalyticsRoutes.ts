// src/api/routes/goalAnalytics.ts
import { Router } from "express";
import { check, query } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import {
  getUserGoalAnalytics,
  getGoalAnalyticsById,
  getGoalAnalyticsByDateRange,
} from "../controllers/goalAnalyticsController";

const router = Router();

/**
 * GET /api/analytics/goals
 * Get overall analytics for user goals
 */
router.get(
  "/goals",
  protect,
  getUserGoalAnalytics
);

/**
 * GET /api/analytics/goals/:goalId
 * Get analytics for a specific goal by ID
 */
router.get(
  "/goals/:goalId",
  protect,
  check("goalId", "Goal ID is invalid").isMongoId(),
  handleValidationErrors,
  getGoalAnalyticsById
);

/**
 * GET /api/analytics/goals/date-range
 * Get goal analytics filtered by date range
 */
router.get(
  "/goals/date-range",
  protect,
  [
    query("startDate", "Invalid start date").notEmpty().isISO8601(),
    query("endDate",   "Invalid end date").notEmpty().isISO8601(),
  ],
  handleValidationErrors,
  getGoalAnalyticsByDateRange
);

export default router;
