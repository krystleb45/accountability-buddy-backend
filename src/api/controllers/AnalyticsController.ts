import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import type { AuthenticatedRequest, AnalyticsRequestBody } from "../../types/AuthenticatedRequest";

/**
 * Fetch user-specific analytics
 */
export const getUserAnalytics = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Cast req to our custom type
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return next(createError("User ID is required", 400));
    }

    // Placeholder logic for user analytics (replace with actual implementation)
    const analytics = {
      totalGoals: 10, // Example value
      completedGoals: 7,
      pendingTasks: 15,
    };

    sendResponse(res, 200, true, "User analytics fetched successfully", { analytics });
  }
);

/**
 * Fetch global analytics
 */
export const getGlobalAnalytics = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // No custom properties needed here; simply use the standard Request.
    const analytics = {
      totalUsers: 500,
      totalGoals: 1000,
      totalTasks: 4000,
    };

    sendResponse(res, 200, true, "Global analytics fetched successfully", { analytics });
  }
);

/**
 * Fetch custom analytics based on request body
 */
export const getCustomAnalytics = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Cast req to our custom type so we can use the AnalyticsRequestBody type for req.body.
    const authReq = req as AuthenticatedRequest<{}, any, AnalyticsRequestBody>;
    const { startDate, endDate, metric } = authReq.body;

    // Validate request body fields
    if (!startDate || !endDate || !metric) {
      return next(createError("Missing required fields: startDate, endDate, or metric", 400));
    }

    // Ensure the values are valid date strings
    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      return next(createError("Invalid date format. Expected ISO 8601 format.", 400));
    }

    // Ensure metric is a valid string
    if (typeof metric !== "string" || metric.trim().length === 0) {
      return next(createError("Metric must be a non-empty string.", 400));
    }

    // Placeholder for custom analytics logic (replace with actual implementation)
    const analytics = {
      metric,
      data: Math.floor(Math.random() * 1000), // Example: Randomly generated metric data
      startDate,
      endDate,
    };

    sendResponse(res, 200, true, "Custom analytics fetched successfully", { analytics });
  }
);
