// src/api/controllers/AnalyticsController.ts
import type { Request, Response } from "express";
import type { AdminAuthenticatedRequest } from "../../types/AdminAuthenticatedRequest";
import { PERMISSIONS } from "../../constants/roles";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import AnalyticsService from "../services/AnalyticsService";

// ────────────────────────────
// Dashboard overview analytics
// GET  /api/admin/analytics
// ────────────────────────────
export const getDashboardAnalytics = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    // reuse the same totals you had before, or swap in service.dashboardTotals() if you like
    const data = await AnalyticsService.getGlobalAnalytics();
    sendResponse(res, 200, true, "Dashboard analytics fetched successfully", data);
  }
);

// ────────────────────────────
// User analytics
// GET  /api/admin/analytics/users
// ────────────────────────────
export const getUserAnalytics = catchAsync(
  async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    if (!PERMISSIONS.VIEW_ANALYTICS.includes(currentUser.role)) {
      throw createError("Access denied. Insufficient privileges.", 403);
    }

    // service takes (userId, endDate?, metric?) — here we just pass userId
    const analytics = await AnalyticsService.getUserAnalytics(currentUser.id);
    if (analytics == null) {
      throw createError("Failed to compute user analytics", 500);
    }

    sendResponse(res, 200, true, "User analytics fetched successfully", { analytics });
  }
);

// ────────────────────────────
// Global goal/post analytics
// GET  /api/admin/analytics/goals
// GET  /api/admin/analytics/posts
// ────────────────────────────
export const getGlobalAnalytics = catchAsync(
  async (_req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    const data = await AnalyticsService.getGlobalAnalytics();
    if (data == null) {
      throw createError("Failed to compute global analytics", 500);
    }
    sendResponse(res, 200, true, "Global analytics fetched successfully", { data });
  }
);

// ────────────────────────────
// Financial analytics
// GET  /api/admin/analytics/financial
// ────────────────────────────
export const getFinancialAnalytics = catchAsync(
  async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    const currentUser = req.user!;
    if (!PERMISSIONS.EDIT_SETTINGS.includes(currentUser.role)) {
      throw createError("Access denied. Only Super Admins can view financial analytics.", 403);
    }

    // for now your service doesn’t have a dedicated financial method, so reuse getGlobalAnalytics
    const analytics = await AnalyticsService.getGlobalAnalytics();
    sendResponse(res, 200, true, "Financial analytics fetched successfully", { analytics });
  }
);

// ────────────────────────────
// Custom analytics
// POST /api/admin/analytics/custom
// ────────────────────────────
export const getCustomAnalytics = catchAsync(
  async (
    req: AdminAuthenticatedRequest<{}, any, { startDate: string; endDate: string; metric: string }>,
    res: Response
  ): Promise<void> => {
    const { startDate, endDate, metric } = req.body;
    if (!startDate || !endDate || !metric) {
      throw createError("Missing required fields: startDate, endDate, metric", 400);
    }
    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      throw createError("Invalid date format. Expected ISO 8601.", 400);
    }

    // AnalyticsService.getUserAnalytics can take metric/endDate as optional args
    const analytics = await AnalyticsService.getUserAnalytics(req.user!.id, endDate, metric);
    if (analytics == null) {
      throw createError("Failed to compute custom analytics", 500);
    }

    sendResponse(res, 200, true, "Custom analytics fetched successfully", { analytics });
  }
);
