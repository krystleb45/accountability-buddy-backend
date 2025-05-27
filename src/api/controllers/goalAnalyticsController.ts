// src/api/controllers/GoalAnalyticsController.ts
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import GoalAnalyticsService from "../services/GoalAnalyticsService";

/**
 * GET /api/analytics/goals
 * Fetch overall analytics for all of the current user's goals.
 * Always returns 200, even if the array is empty.
 */
export const getUserGoalAnalytics = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const analytics = await GoalAnalyticsService.getByUser(userId);
    sendResponse(res, 200, true, "User goal analytics fetched successfully", { analytics });
  }
);

/**
 * GET /api/analytics/goals/:goalId
 * Fetch detailed analytics for a specific goal.
 */
export const getGoalAnalyticsById = catchAsync(
  async (req: Request<{ goalId: string }>, res: Response): Promise<void> => {
    const { goalId } = req.params;
    const analytics = await GoalAnalyticsService.getByGoal(goalId);
    if (!analytics) {
      sendResponse(res, 404, false, "Goal analytics not found");
      return;
    }
    sendResponse(res, 200, true, "Goal analytics fetched successfully", { analytics });
  }
);

/**
 * GET /api/analytics/goals/date-range?startDate=...&endDate=...
 * Fetch goal analytics filtered to a specific date range.
 */
export const getGoalAnalyticsByDateRange = catchAsync(
  async (
    req: Request<{}, any, any, { startDate: string; endDate: string }>,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;
    const analytics = await GoalAnalyticsService.getByDateRange(userId, startDate, endDate);
    sendResponse(
      res,
      200,
      true,
      "User goal analytics in date range fetched successfully",
      { analytics }
    );
  }
);

/**
 * GET /api/analytics/goals/admin
 * (Optional) Global analytics for admins only.
 */
export const getGlobalGoalAnalytics = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    if (req.user?.role !== "admin") throw createError("Access denied", 403);
    const analytics = await GoalAnalyticsService.getAll();
    sendResponse(res, 200, true, "Global goal analytics fetched successfully", { analytics });
  }
);

export default {
  getUserGoalAnalytics,
  getGoalAnalyticsById,
  getGoalAnalyticsByDateRange,
  getGlobalGoalAnalytics,
};
