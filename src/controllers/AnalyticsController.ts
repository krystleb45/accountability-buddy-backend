import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

/**
 * Fetch user-specific analytics
 */
export const getUserAnalytics = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly define generics for Request
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return next(createError("User ID is required", 400));
      }

      // Placeholder logic for user analytics (replace with actual implementation)
      const analytics = {
        totalGoals: 10, // Example value
        completedGoals: 7,
        pendingTasks: 15,
      };

      sendResponse(res, 200, true, "User analytics fetched successfully", {
        analytics,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Fetch global analytics
 */
export const getGlobalAnalytics = catchAsync(
  async (
    _req: Request<{}, {}, {}, {}>, // Explicitly define generics for Request
    res: Response,
  ): Promise<void> => {
    // Placeholder logic for global analytics (replace with actual implementation)
    const analytics = {
      totalUsers: 500,
      totalGoals: 1000,
      totalTasks: 4000,
    };

    sendResponse(res, 200, true, "Global analytics fetched successfully", {
      analytics,
    });
  },
);

/**
 * Fetch custom analytics based on query
 */
export const getCustomAnalytics = catchAsync(
  async (
    req: Request<{}, {}, {}, { type?: string }>, // Explicitly define generics with query parameters
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { type } = req.query;

      if (!type || typeof type !== "string") {
        return next(
          createError("Invalid or missing query parameter 'type'", 400),
        );
      }

      // Placeholder for custom analytics based on type (replace with actual implementation)
      const analytics =
        type === "user" ? { userCount: 50 } : { taskCount: 200 };

      sendResponse(res, 200, true, "Custom analytics fetched successfully", {
        analytics,
      });
    } catch (error) {
      next(error);
    }
  },
);
