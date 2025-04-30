// src/api/controllers/GoalAnalyticsController.ts
import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import GoalAnalyticsService from "../services/GoalAnalyticsService";

export const getUserGoalAnalytics = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id!;
  const analytics = await GoalAnalyticsService.getByUser(userId);
  if (analytics.length === 0) {
    sendResponse(res, 404, false, "No goal analytics found for the user");
    return;
  }
  sendResponse(res, 200, true, "User goal analytics fetched successfully", { analytics });
});

export const getGlobalGoalAnalytics = catchAsync(async (req: Request, res: Response) => {
  if (req.user?.role !== "admin") throw createError("Access denied", 403);
  const analytics = await GoalAnalyticsService.getAll();
  if (analytics.length === 0) {
    sendResponse(res, 404, false, "No global goal analytics found");
    return;
  }
  sendResponse(res, 200, true, "Global goal analytics fetched successfully", { analytics });
});

export const getGoalAnalyticsById = catchAsync(async (req: Request<{ goalId: string }>, res: Response) => {
  const { goalId } = req.params;
  const analytics = await GoalAnalyticsService.getByGoal(goalId);
  if (!analytics) {
    sendResponse(res, 404, false, "Goal analytics not found");
    return;
  }
  sendResponse(res, 200, true, "Goal analytics fetched successfully", { analytics });
});

export const updateGoalAnalytics = catchAsync(async (req: Request<{ goalId: string }>, res: Response) => {
  const { goalId } = req.params;
  const updated = await GoalAnalyticsService.update(goalId, req.body);
  if (!updated) {
    sendResponse(res, 404, false, "Goal analytics not found");
    return;
  }
  sendResponse(res, 200, true, "Goal analytics updated successfully", { analytics: updated });
});

export const deleteGoalAnalytics = catchAsync(async (req: Request<{ goalId: string }>, res: Response) => {
  if (req.user?.role !== "admin") throw createError("Access denied", 403);
  const { goalId } = req.params;
  const deleted = await GoalAnalyticsService.delete(goalId);
  if (!deleted) {
    sendResponse(res, 404, false, "Goal analytics not found");
    return;
  }
  sendResponse(res, 200, true, "Goal analytics deleted successfully");
});

export const getGoalAnalyticsByDateRange = catchAsync(async (
  req: Request<{ goalId: string }, any, any, { startDate: string; endDate: string }>,
  res: Response
) => {
  if (req.user?.role !== "admin") throw createError("Access denied", 403);
  const { goalId } = req.params;
  const { startDate, endDate } = req.query;
  const analytics = await GoalAnalyticsService.getByDateRange(goalId, startDate, endDate);
  if (analytics.length === 0) {
    sendResponse(res, 404, false, "No analytics found in date range");
    return;
  }
  sendResponse(res, 200, true, "Goal analytics by date range fetched successfully", { analytics });
});

export default {
  getUserGoalAnalytics,
  getGlobalGoalAnalytics,
  getGoalAnalyticsById,
  updateGoalAnalytics,
  deleteGoalAnalytics,
  getGoalAnalyticsByDateRange,
};
