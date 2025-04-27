import type { Request, Response } from "express";
import mongoose from "mongoose";
import Activity from "../models/Activity";
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
    const total = await Activity.countDocuments(query);
    if (!activities || activities.length === 0) {
      sendResponse(res, 404, false, "No activities found for this user");
      return;
    }

    sendResponse(res, 200, true, "User activities fetched successfully", {
      activities,
      total,
      pagination: {
        page: parseInt(page),
        limit: perPage,
      },
    });
  }
);


/**
 * @desc    Fetch one activity by ID
 * @route   GET /api/activity/:activityId
 * @access  Private
 */
export const getActivityById = catchAsync(
  async (req: Request<{ activityId: string }>, res: Response) => {
    const { activityId } = req.params;
    if (!mongoose.isValidObjectId(activityId)) {
      throw createError("Invalid activity ID", 400);
    }
    const activity = await Activity.findById(activityId);
    if (!activity || activity.isDeleted) {
      throw createError("Activity not found", 404);
    }
    sendResponse(res, 200, true, "Activity fetched successfully", { activity });
  }
);

/**
 * @desc    Create a new activity
 * @route   POST /api/activity
 * @access  Private
 */
export const createActivity = catchAsync(
  async (
    req: Request<{}, any, Partial<{ title: string; description: string; metadata: Record<string, unknown> }>>,
    res: Response
  ) => {
    const userId = req.user?.id;
    if (!userId) throw createError("Unauthorized", 401);

    const body = sanitizeInput(req.body);
    const { title, description, metadata } = body;
    if (!title || typeof title !== "string") {
      throw createError("Title is required", 400);
    }

    const newAct = new Activity({
      user: userId,
      title,
      description: description || "",
      metadata: metadata || {},
      participants: [], // initialize
    });
    await newAct.save();
    sendResponse(res, 201, true, "Activity created successfully", { activity: newAct });
  }
);

/**
 * @desc    Update an existing activity
 * @route   PUT /api/activity/:activityId
 * @access  Private
 */
export const updateActivity = catchAsync(
  async (
    req: Request<{ activityId: string }, any, Partial<{ title: string; description: string; metadata: Record<string,unknown> }>>,
    res: Response
  ) => {
    const { activityId } = req.params;
    if (!mongoose.isValidObjectId(activityId)) {
      throw createError("Invalid activity ID", 400);
    }
    const userId = req.user?.id!;
    const act = await Activity.findOne({ _id: activityId, user: userId, isDeleted: { $ne: true } });
    if (!act) throw createError("Activity not found or unauthorized", 404);

    const updates = sanitizeInput(req.body);
    Object.assign(act, updates);
    await act.save();
    sendResponse(res, 200, true, "Activity updated successfully", { activity: act });
  }
);

/**
 * @desc    Join an activity
 * @route   POST /api/activity/:activityId/join
 * @access  Private
 */
export const joinActivity = catchAsync(
  async (req: Request<{ activityId: string }>, res: Response) => {
    const { activityId } = req.params;
    const userId = req.user?.id!;
    if (!mongoose.isValidObjectId(activityId)) {
      throw createError("Invalid activity ID", 400);
    }
    const act = await Activity.findById(activityId);
    if (!act || act.isDeleted) throw createError("Activity not found", 404);

    // ensure participants array
    act.participants = Array.isArray(act.participants) ? act.participants : [];
    if (!act.participants.includes(userId as any)) {
      act.participants.push(new mongoose.Types.ObjectId(userId));
      await act.save();
    }
    sendResponse(res, 200, true, "Joined activity successfully", { activity: act });
  }
);

/**
 * @desc    Leave an activity
 * @route   POST /api/activity/:activityId/leave
 * @access  Private
 */
export const leaveActivity = catchAsync(
  async (req: Request<{ activityId: string }>, res: Response) => {
    const { activityId } = req.params;
    const userId = req.user?.id!;
    if (!mongoose.isValidObjectId(activityId)) {
      throw createError("Invalid activity ID", 400);
    }
    const act = await Activity.findById(activityId);
    if (!act || act.isDeleted) throw createError("Activity not found", 404);

    act.participants = (act.participants || []).filter(
      (id: mongoose.Types.ObjectId) => id.toString() !== userId
    );
    await act.save();
    sendResponse(res, 200, true, "Left activity successfully", { activity: act });
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
