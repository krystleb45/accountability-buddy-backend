// src/api/routes/adminAnalytics.ts
import { Router, RequestHandler } from "express";
import { check, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import * as AnalyticsController from "../controllers/AnalyticsController";

const router = Router();
const isAdmin: RequestHandler = roleBasedAccessControl(["admin"]);

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
  // cast to RequestHandler so TS is happy
  // cast to RequestHandler so TS is happy
  AnalyticsController.getDashboardAnalytics as unknown as RequestHandler
);

// User analytics
router.get(
  "/users",
  protect,
  isAdmin,
  AnalyticsController.getUserAnalytics as RequestHandler
);

// Goal analytics
router.get(
  "/goals",
  protect,
  isAdmin,
  AnalyticsController.getGlobalAnalytics as RequestHandler
);

// Post analytics (same controller as goals)
router.get(
  "/posts",
  protect,
  isAdmin,
  AnalyticsController.getGlobalAnalytics as RequestHandler
);

// Financial analytics
router.get(
  "/financial",
  protect,
  isAdmin,
  AnalyticsController.getFinancialAnalytics as unknown as RequestHandler
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
      return;          // swallow and return void
    }
    next();            // likewise returns void
  },
  AnalyticsController.getCustomAnalytics as RequestHandler
);

export default router;
