import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import * as AdminController from "../controllers/AdminController";
import * as AnalyticsController from "../controllers/AnalyticsController";
import type { AdminAuthenticatedRequest } from "../../types/AdminAuthenticatedRequest";
import type { AnalyticsRequestBody } from "../../types/AuthenticatedRequest";

const router: Router = express.Router();

const isAdmin: RequestHandler = roleBasedAccessControl(["admin"]);

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/**
 * @swagger
 * tags:
 *   name: AdminAnalytics
 *   description: Admin analytics and dashboard insights
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
      if (!(req as any).user) {
        return Promise.reject(new Error("Unauthorized access"));
      }
      const adminReq = req as unknown as AdminAuthenticatedRequest<{}, any, T>;
      return handler(adminReq, res, next);
    };

/**
 * @swagger
 * /api/admin/analytics/users:
 *   get:
 *     summary: Fetch user analytics
 *     tags: [AdminAnalytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User analytics retrieved successfully
 *       401:
 *         description: Unauthorized or not admin
 */
router.get(
  "/users",
  protect,
  isAdmin,
  handleAdminRoute(async (req, res, next) => {
    await AdminController.getUserAnalytics(req, res, next);
  })
);

/**
 * @swagger
 * /api/admin/analytics/goals:
 *   get:
 *     summary: Fetch goal analytics
 *     tags: [AdminAnalytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Goal analytics retrieved successfully
 *       401:
 *         description: Unauthorized or not admin
 */
router.get(
  "/goals",
  protect,
  isAdmin,
  handleAdminRoute(async (req, res, next) => {
    await AnalyticsController.getGlobalAnalytics(req, res, next);
  })
);

/**
 * @swagger
 * /api/admin/analytics/posts:
 *   get:
 *     summary: Fetch post analytics
 *     tags: [AdminAnalytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Post analytics retrieved successfully
 *       401:
 *         description: Unauthorized or not admin
 */
router.get(
  "/posts",
  protect,
  isAdmin,
  handleAdminRoute(async (req, res, next) => {
    await AnalyticsController.getGlobalAnalytics(req, res, next);
  })
);

/**
 * @swagger
 * /api/admin/analytics/financial:
 *   get:
 *     summary: Fetch financial analytics
 *     tags: [AdminAnalytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial analytics retrieved successfully
 *       401:
 *         description: Unauthorized or not admin
 */
router.get(
  "/financial",
  protect,
  isAdmin,
  handleAdminRoute(async (req, res, next) => {
    await AdminController.getFinancialAnalytics(req, res, next);
  })
);

/**
 * @swagger
 * /api/admin/analytics/custom:
 *   post:
 *     summary: Fetch custom analytics based on date and metric
 *     tags: [AdminAnalytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *               - metric
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *               metric:
 *                 type: string
 *                 example: "userSignups"
 *     responses:
 *       200:
 *         description: Custom analytics returned
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized or not admin
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
  handleAdminRoute<AnalyticsRequestBody>(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    await AnalyticsController.getCustomAnalytics(req, res, next);
  })
);

export default router;
