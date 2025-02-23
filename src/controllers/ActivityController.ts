import type { Request, Response } from "express";
import Activity from "../models/Activity"; // ✅ Fixed: Renamed from UserActivity
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
    req: Request<{}, any, { type: string; description?: string; metadata?: Record<string, any> }>,
    res: Response
  ): Promise<void> => {
    const { type, description, metadata } = sanitizeInput(req.body);
    const userId = req.user?.id;

    // Validate inputs
    if (!type || typeof type !== "string") {
      throw createError("Invalid activity type", 400);
    }

    // Save activity with metadata support
    const newActivity = new Activity({
      user: userId,
      type,
      description,
      metadata: metadata || {}, // Ensure metadata is stored as an object
    });

    await newActivity.save();

    sendResponse(res, 201, true, "Activity logged successfully", {
      activity: newActivity,
    });
  }
);

/**
 * @desc    Get user activities with filtering & pagination
 * @route   GET /api/activity
 * @access  Private
 */
export const getUserActivities = catchAsync(
  async (
    req: Request<{}, {}, {}, { type?: string; limit?: string; page?: string }>,
    res: Response
  ): Promise<void> => {
    const userId = req.user?.id;
    const { type, limit = "10", page = "1" } = req.query;

    if (!userId) {
      throw createError("User ID is required", 400);
    }

    // Query conditions
    const query: Record<string, any> = { user: userId };
    if (type) {
      query.type = type;
    }

    // Pagination setup
    const perPage = parseInt(limit);
    const skip = (parseInt(page) - 1) * perPage;

    // Fetch user activities
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage);

    if (!activities || activities.length === 0) {
      sendResponse(res, 404, false, "No activities found for this user");
      return;
    }

    sendResponse(res, 200, true, "User activities fetched successfully", {
      activities,
      pagination: {
        page: parseInt(page),
        limit: perPage,
      },
    });
  }
);

/**
 * @desc    Delete or soft-delete an activity
 * @route   DELETE /api/activity/:activityId
 * @access  Private
 */
export const deleteActivity = catchAsync(
  async (req: Request<{ activityId: string }>, res: Response): Promise<void> => {
    const { activityId } = req.params;
    const userId = req.user?.id;

    const activity = await Activity.findOne({ _id: activityId, user: userId });
    if (!activity) {
      throw createError("Activity not found or unauthorized", 404);
    }

    // Soft delete (mark as deleted)
    activity.isDeleted = true;
    await activity.save();

    sendResponse(res, 200, true, "Activity deleted successfully");
  }
);

export default {
  logActivity,
  getUserActivities,
  deleteActivity, // ✅ New soft delete feature
};
