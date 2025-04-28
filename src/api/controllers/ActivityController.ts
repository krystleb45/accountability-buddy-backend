// src/api/controllers/ActivityController.ts
import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import ActivityService from "../services/ActivityService";

interface QueryParams {
  type?: string;
  limit?: string;
  page?: string;
}

interface CreateBody {
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface UpdateBody {
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * @desc    Log user activity (alias for createActivity/logging endpoint)
 * @route   POST /api/activity/log
 * @access  Private
 */
export const logActivity = catchAsync(
  async (req: Request<{}, any, CreateBody>, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) return next(createError("Unauthorized", 401));

    const { title, description, metadata } = req.body;
    if (!title) return next(createError("Title is required", 400));

    const activity = await ActivityService.logActivity(userId, title, description, metadata);
    sendResponse(res, 201, true, "Activity logged successfully", { activity });
  }
);

/**
 * @desc    Create a new activity
 * @route   POST /api/activity
 * @access  Private
 */
export const createActivity = catchAsync(
  async (req: Request<{}, any, CreateBody>, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) return next(createError("Unauthorized", 401));

    const { title, description, metadata } = req.body;
    if (!title) return next(createError("Title is required", 400));

    const activity = await ActivityService.createActivity(userId, title, description, metadata);
    sendResponse(res, 201, true, "Activity created successfully", { activity });
  }
);

/**
 * @desc    Get user activities with filtering & pagination
 * @route   GET /api/activity
 * @access  Private
 */
export const getUserActivities = catchAsync(
  async (req: Request<{}, any, any, QueryParams>, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) return next(createError("Unauthorized", 401));

    const page = parseInt(req.query.page ?? "1", 10);
    const limit = parseInt(req.query.limit ?? "10", 10);
    const type = req.query.type;

    const { activities, total } = await ActivityService.getUserActivities(userId, { type, page, limit });

    if (!activities.length) {
      sendResponse(res, 404, false, "No activities found for this user");
      return;
    }

    sendResponse(res, 200, true, "User activities fetched successfully", {
      activities,
      total,
      pagination: { page, limit },
    });
  }
);

/**
 * @desc    Fetch one activity by ID
 * @route   GET /api/activity/:activityId
 * @access  Private
 */
export const getActivityById = catchAsync(
  async (req: Request<{ activityId: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const { activityId } = req.params;
    const activity = await ActivityService.getActivityById(activityId);
    sendResponse(res, 200, true, "Activity fetched successfully", { activity });
  }
);

/**
 * @desc    Update an existing activity
 * @route   PUT /api/activity/:activityId
 * @access  Private
 */
export const updateActivity = catchAsync(
  async (
    req: Request<{ activityId: string }, any, UpdateBody>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const { activityId } = req.params;
    const updates = req.body;
    const activity = await ActivityService.updateActivity(req.user!.id, activityId, updates);
    sendResponse(res, 200, true, "Activity updated successfully", { activity });
  }
);

/**
 * @desc    Join an activity
 * @route   POST /api/activity/:activityId/join
 * @access  Private
 */
export const joinActivity = catchAsync(
  async (req: Request<{ activityId: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const { activityId } = req.params;
    const activity = await ActivityService.joinActivity(req.user!.id, activityId);
    sendResponse(res, 200, true, "Joined activity successfully", { activity });
  }
);

/**
 * @desc    Leave an activity
 * @route   POST /api/activity/:activityId/leave
 * @access  Private
 */
export const leaveActivity = catchAsync(
  async (req: Request<{ activityId: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const { activityId } = req.params;
    const activity = await ActivityService.leaveActivity(req.user!.id, activityId);
    sendResponse(res, 200, true, "Left activity successfully", { activity });
  }
);

/**
 * @desc    Soft-delete an activity
 * @route   DELETE /api/activity/:activityId
 * @access  Private
 */
export const deleteActivity = catchAsync(
  async (req: Request<{ activityId: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const { activityId } = req.params;
    await ActivityService.deleteActivity(req.user!.id, activityId);
    sendResponse(res, 200, true, "Activity deleted successfully");
  }
);

export default {
  logActivity,
  createActivity,
  getUserActivities,
  getActivityById,
  updateActivity,
  joinActivity,
  leaveActivity,
  deleteActivity,
};
