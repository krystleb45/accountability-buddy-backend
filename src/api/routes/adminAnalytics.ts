// src/api/routes/adminAnalytics.ts
import { Router } from "express";
import { check, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";

import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import catchAsync from "../utils/catchAsync";
import * as AnalyticsController from "../controllers/AnalyticsController";

const router = Router();
const isAdmin = roleBasedAccessControl(["admin"]);
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// Dashboard overview analytics
router.get(
  "/",
  protect,
  isAdmin,
  catchAsync(async (req, res, next) => {
    // await ensures Promise<void> signature
    await AnalyticsController.getDashboardAnalytics(req, res, next);
  })
);

// User analytics
router.get(
  "/users",
  protect,
  isAdmin,
  catchAsync(async (req, res, next) => {
    await AnalyticsController.getUserAnalytics(req, res, next);
  })
);

// Goal analytics
router.get(
  "/goals",
  protect,
  isAdmin,
  catchAsync(async (req, res, next) => {
    await AnalyticsController.getGlobalAnalytics(req, res, next);
  })
);

// Post analytics (same controller as goals)
router.get(
  "/posts",
  protect,
  isAdmin,
  catchAsync(async (req, res, next) => {
    await AnalyticsController.getGlobalAnalytics(req, res, next);
  })
);

// Financial analytics
router.get(
  "/financial",
  protect,
  isAdmin,
  catchAsync(async (req, res, next) => {
    await AnalyticsController.getFinancialAnalytics(req, res, next);
  })
);

// Custom analytics
router.post(
  "/custom",
  protect,
  isAdmin,
  rateLimiter,
  check("startDate", "Start date is required").notEmpty().isISO8601(),
  check("endDate", "End date is required").notEmpty().isISO8601(),
  check("metric", "Metric is required").notEmpty().isString(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    next();
  },
  catchAsync(async (req, res, next) => {
    await AnalyticsController.getCustomAnalytics(req, res, next);
  })
);

export default router;
