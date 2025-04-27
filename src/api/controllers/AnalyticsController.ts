import type { Request, Response } from "express";
import { User } from "../models/User";
import Report from "../models/Report";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import { PERMISSIONS } from "../../constants/roles";
import type { AdminAuthenticatedRequest } from "../../types/AdminAuthenticatedRequest";

/**
 * GET  /api/admin/analytics
 * Dashboard overview: total users, active users, total reports
 */
export const getDashboardAnalytics = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const totalUsers   = await User.countDocuments();
    const activeUsers  = await User.countDocuments({ active: true });
    const reportsCount = await Report.countDocuments();

    sendResponse(res, 200, true, "Dashboard analytics fetched successfully", {
      totalUsers,
      activeUsers,
      reports: reportsCount,
    });
  }
);

/**
 * GET  /api/admin/analytics/users
 * Detailed user analytics (placeholder)
 */
export const getUserAnalytics = catchAsync(
  async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    if (!PERMISSIONS.VIEW_ANALYTICS.includes(currentUser.role)) {
      throw createError("Access denied. Insufficient privileges.", 403);
    }

    // TODO: replace with real user analytics logic
    const analytics = {
      totalUsersByRole: {
        admin: 5,
        member: 200,
      },
      newSignupsLastWeek: 12,
    };

    sendResponse(res, 200, true, "User analytics fetched successfully", { analytics });
  }
);

/**
 * GET  /api/admin/analytics/goals
 * GET  /api/admin/analytics/posts
 * Global goal/post analytics (placeholder)
 */
export const getGlobalAnalytics = catchAsync(
  async (_req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    // TODO: replace with real goal/post analytics logic
    const data = {
      totalGoalsCreated: 1500,
      totalPosts: 3200,
    };

    sendResponse(res, 200, true, "Global analytics fetched successfully", { data });
  }
);

/**
 * GET  /api/admin/analytics/financial
 * Financial analytics (placeholder)
 */
export const getFinancialAnalytics = catchAsync(
  async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    if (!PERMISSIONS.EDIT_SETTINGS.includes(currentUser.role)) {
      throw createError("Access denied. Only Super Admins can view financial analytics.", 403);
    }

    // TODO: replace with real financial analytics logic
    const analytics = {
      totalRevenue: 12500,
      monthlyRecurringRevenue: 4200,
    };

    sendResponse(res, 200, true, "Financial analytics fetched successfully", { analytics });
  }
);

/**
 * POST /api/admin/analytics/custom
 * Custom analytics based on date range + metric
 */
export const getCustomAnalytics = catchAsync(
  async (
    req: AdminAuthenticatedRequest<{}, any, { startDate: string; endDate: string; metric: string }>,
    res: Response
  ): Promise<void> => {
    const { startDate, endDate, metric } = req.body;

    // Validate inputs
    if (!startDate || !endDate || !metric) {
      throw createError("Missing required fields: startDate, endDate, metric", 400);
    }
    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      throw createError("Invalid date format. Expected ISO 8601.", 400);
    }
    if (typeof metric !== "string" || metric.trim().length === 0) {
      throw createError("Metric must be a non-empty string.", 400);
    }

    // TODO: replace with your custom analytics computation
    const analytics = {
      startDate,
      endDate,
      metric,
      value: Math.floor(Math.random() * 1000),
    };

    sendResponse(res, 200, true, "Custom analytics fetched successfully", { analytics });
  }
);
