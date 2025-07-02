// src/api/routes/goalAnalyticsRoutes.ts - Updated with subscription restrictions and proper typing
import { Router, Request, Response } from "express";
import { check, query } from "express-validator";
import { protect } from "../middleware/authJwt";
import { validateSubscription, validateFeatureAccess, trialPrompt } from "../middleware/subscriptionValidation";
import handleValidationErrors from "../middleware/handleValidationErrors";
import {
  getUserGoalAnalytics,
  getGoalAnalyticsById,
  getGoalAnalyticsByDateRange,
} from "../controllers/goalAnalyticsController";

const router = Router();

/**
 * GET /api/analytics/goals
 * Overall goal analytics for the user
 * Basic analytics for all plans, with trial prompts
 */
router.get(
  "/goals",
  protect,
  validateSubscription,
  trialPrompt("basic-analytics"), // Show upgrade hint for trial users
  getUserGoalAnalytics
);

/**
 * GET /api/analytics/goals/:goalId
 * Per-goal analytics, all time
 * Basic analytics for all plans, with trial prompts
 */
router.get(
  "/goals/:goalId",
  protect,
  validateSubscription,
  trialPrompt("goal-analytics"),
  check("goalId", "Goal ID is invalid").isMongoId(),
  handleValidationErrors,
  getGoalAnalyticsById
);

/**
 * GET /api/analytics/goals/:goalId/date-range
 * Per-goal analytics with date range filtering
 * Advanced feature - requires Pro+ plan
 */
router.get(
  "/goals/:goalId/date-range",
  protect,
  validateSubscription,
  validateFeatureAccess("analytics"), // Pro+ plan required for advanced analytics
  check("goalId", "Goal ID is invalid").isMongoId(),
  query("startDate", "Invalid or missing startDate").notEmpty().isISO8601(),
  query("endDate", "Invalid or missing endDate").notEmpty().isISO8601(),
  handleValidationErrors,
  getGoalAnalyticsByDateRange
);

/**
 * GET /api/analytics/advanced
 * Advanced analytics dashboard (Pro+ plans only)
 */
router.get(
  "/advanced",
  protect,
  validateSubscription,
  validateFeatureAccess("analytics"), // Pro+ plan required
  // Add your advanced analytics controller here
  (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      message: "Advanced analytics controller not implemented yet",
      note: "This endpoint requires Pro or Elite plan"
    });
  }
);

/**
 * GET /api/analytics/reports
 * Generate detailed reports (Pro+ plans only)
 */
router.get(
  "/reports",
  protect,
  validateSubscription,
  validateFeatureAccess("analytics"), // Pro+ plan required
  [
    query("reportType").optional().isIn(["monthly", "quarterly", "yearly"]),
    query("format").optional().isIn(["json", "csv", "pdf"]),
    handleValidationErrors,
  ],
  // Add your reports controller here
  (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      message: "Reports controller not implemented yet",
      note: "This endpoint requires Pro or Elite plan"
    });
  }
);

/**
 * GET /api/analytics/export
 * Export analytics data (Pro+ plans only)
 */
router.get(
  "/export",
  protect,
  validateSubscription,
  validateFeatureAccess("analytics"), // Pro+ plan required
  [
    query("format").optional().isIn(["csv", "json", "xlsx"]),
    query("dateRange").optional().isIn(["week", "month", "quarter", "year", "all"]),
    handleValidationErrors,
  ],
  // Add your export controller here
  (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      message: "Export controller not implemented yet",
      note: "This endpoint requires Pro or Elite plan"
    });
  }
);

/**
 * GET /api/analytics/insights
 * AI-powered insights (Elite plan only)
 */
router.get(
  "/insights",
  protect,
  validateSubscription,
  validateFeatureAccess("analytics"), // Pro+ plan required (you could make this Elite-only later)
  // Add your AI insights controller here
  (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      message: "AI insights controller not implemented yet",
      note: "This endpoint requires Pro or Elite plan"
    });
  }
);

export default router;
