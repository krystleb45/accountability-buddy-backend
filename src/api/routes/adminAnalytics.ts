import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import * as AdminController from "../controllers/AdminController";
import * as AnalyticsController from "../controllers/AnalyticsController";
import type { AdminAuthenticatedRequest } from "../types/AdminAuthenticatedRequest";
import type { AnalyticsRequestBody } from "../types/AuthenticatedRequest"; // Ensure this type is exported

const router: Router = express.Router();

const isAdmin: RequestHandler = roleBasedAccessControl(["admin"]);

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Allow 10 requests per window
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/**
 * Helper to wrap admin routes that require a full authenticated user.
 * This helper checks at runtime that req.user exists and then casts req to
 * an AdminAuthenticatedRequest. If req.user is missing, it rejects with an error.
 */
const handleAdminRoute =
  <T = any>(
    handler: (
      req: AdminAuthenticatedRequest<{}, any, T>,
      res: Response,
      next: NextFunction
    ) => Promise<void>
  ): RequestHandler =>
    (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Runtime check: if no user is attached, reject immediately.
      if (!(req as any).user) {
        return Promise.reject(new Error("Unauthorized access"));
      }
      // Cast req to AdminAuthenticatedRequest.
      const adminReq = req as unknown as AdminAuthenticatedRequest<{}, any, T>;
      return handler(adminReq, res, next);
    };

/**
 * @route GET /api/admin/analytics/users
 * @desc Fetch user analytics
 * @access Private - Admin only
 */
router.get(
  "/users",
  protect,
  isAdmin,
  handleAdminRoute(async (req: AdminAuthenticatedRequest, res: Response, next: NextFunction) => {
    await AdminController.getUserAnalytics(req, res, next);
  })
);

/**
 * @route GET /api/admin/analytics/goals
 * @desc Fetch goal analytics
 * @access Private - Admin only
 */
router.get(
  "/goals",
  protect,
  isAdmin,
  handleAdminRoute(async (req: AdminAuthenticatedRequest, res: Response, next: NextFunction) => {
    await AnalyticsController.getGlobalAnalytics(req, res, next);
  })
);

/**
 * @route GET /api/admin/analytics/posts
 * @desc Fetch post analytics
 * @access Private - Admin only
 */
router.get(
  "/posts",
  protect,
  isAdmin,
  handleAdminRoute(async (req: AdminAuthenticatedRequest, res: Response, next: NextFunction) => {
    await AnalyticsController.getGlobalAnalytics(req, res, next);
  })
);

/**
 * @route GET /api/admin/analytics/financial
 * @desc Fetch financial analytics
 * @access Private - Admin only
 */
router.get(
  "/financial",
  protect,
  isAdmin,
  handleAdminRoute(async (req: AdminAuthenticatedRequest, res: Response, next: NextFunction) => {
    await AdminController.getFinancialAnalytics(req, res, next);
  })
);

/**
 * @route POST /api/admin/analytics/custom
 * @desc Fetch custom analytics based on date range and metric
 * @access Private - Admin only
 */
router.post(
  "/custom",
  [
    protect,
    isAdmin,
    rateLimiter,
    check("startDate").notEmpty().withMessage("Start date is required").isISO8601().withMessage("Invalid date format"),
    check("endDate").notEmpty().withMessage("End date is required").isISO8601().withMessage("Invalid date format"),
    check("metric").notEmpty().withMessage("Metric is required").isString().withMessage("Metric must be a string"),
  ],
  handleAdminRoute<AnalyticsRequestBody>(async (
    req: AdminAuthenticatedRequest<{}, any, AnalyticsRequestBody>,
    res: Response,
    next: NextFunction
  ) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    await AnalyticsController.getCustomAnalytics(req, res, next);
  })
);

export default router;
