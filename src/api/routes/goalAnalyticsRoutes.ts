// src/api/routes/goalAnalyticsRoutes.ts
import { Router } from "express";
import { check, query } from "express-validator";
import { protect } from "../middleware/authJwt";
import handleValidationErrors from "../middleware/handleValidationErrors";
import {
  getUserGoalAnalytics,
  getGoalAnalyticsById,
  getGoalAnalyticsByDateRange,
} from "../controllers/goalAnalyticsController";

const router = Router();

/** overall for the user */
router.get("/goals", protect, getUserGoalAnalytics);

/** per‐goal, all time */
router.get(
  "/goals/:goalId",
  protect,
  check("goalId", "Goal ID is invalid").isMongoId(),
  handleValidationErrors,
  getGoalAnalyticsById
);

/** per‐goal, date range */
router.get(
  "/goals/:goalId/date-range",
  protect,
  check("goalId", "Goal ID is invalid").isMongoId(),
  query("startDate", "Invalid or missing startDate").notEmpty().isISO8601(),
  query("endDate", "Invalid or missing endDate").notEmpty().isISO8601(),
  handleValidationErrors,
  getGoalAnalyticsByDateRange
);

export default router;
