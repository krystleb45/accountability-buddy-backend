import type { Request, Response  } from "express";
import UserActivity from "../models/UserActivity";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

/**
 * Sanitize inputs to prevent injection attacks
 */
const sanitizeInput = (input: any): any => {
  if (typeof input === "string") {
    return input.replace(/[^\w\s.@-]/g, "");
  }
  if (typeof input === "object" && input !== null) {
    const sanitized: Record<string, any> = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};

/**
 * @desc    Log user activity
 * @route   POST /api/activity
 * @access  Private
 */
export const logActivity = catchAsync(
  async (
    req: Request<{}, any, { activityType: string; details: string }>,
    res: Response,
  ): Promise<void> => {
    const { activityType, details } = sanitizeInput(req.body);
    const userId = req.user?.id;

    // Validate inputs
    if (!activityType || typeof activityType !== "string") {
      throw createError("Invalid activity type", 400);
    }
    if (!details || typeof details !== "string") {
      throw createError("Invalid activity details", 400);
    }

    // Save activity
    const newActivity = new UserActivity({
      user: userId,
      activityType,
      details,
    });
    await newActivity.save();

    sendResponse(res, 201, true, "Activity logged successfully", {
      activity: newActivity,
    });
  },
);

/**
 * @desc    Get user activities
 * @route   GET /api/activity
 * @access  Private
 */
export const getUserActivities = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly define generics
    res: Response,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw createError("User ID is required", 400);
    }

    // Fetch user activities
    const activities = await UserActivity.find({ user: userId }).sort({
      createdAt: -1,
    });

    if (!activities || activities.length === 0) {
      sendResponse(res, 404, false, "No activities found for this user");
      return;
    }

    sendResponse(res, 200, true, "User activities fetched successfully", {
      activities,
    });
  },
);

export default {
  getUserActivities,
};
