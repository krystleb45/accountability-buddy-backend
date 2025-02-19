import type { Request, Response, NextFunction } from "express";
import Goal from "../models/Goal"; // Ensure Goal model exists
import AccountabilityPartnership from "../models/AccountabilityPartnership"; // Ensure Partnership model exists
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import logger from "../utils/winstonLogger"; // Centralized logger

/**
 * @desc Get Progress Dashboard
 * @route GET /api/progress/dashboard
 * @access Private
 */
export const getProgressDashboard = catchAsync(
  async (req: Request<{}, {}, {}, {}>, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 401, false, "User not authenticated");
      return;
    }

    try {
      const goals = await Goal.find({ user: userId })
        .select("title description dueDate status milestones progress")
        .sort({ createdAt: -1 });

      const partnerships = await AccountabilityPartnership.find({
        $or: [{ user1: userId }, { user2: userId }],
      })
        .populate("user1 user2", "username profilePicture")
        .select("-__v")
        .sort({ createdAt: -1 });

      const progressData = {
        goals,
        partnerships,
      };

      sendResponse(
        res,
        200,
        true,
        "Progress dashboard fetched successfully",
        progressData,
      );
    } catch (error) {
      logger.error("Error fetching progress dashboard:", error);
      sendResponse(res, 500, false, "Failed to fetch progress dashboard");
    }
  },
);

/**
 * @desc Get progress for a user
 * @route GET /api/progress
 * @access Private
 */
export const getProgress = catchAsync(
  async (req: Request<{}, {}, {}, {}>, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 401, false, "User not authenticated");
      return;
    }

    try {
      const goals = await Goal.find({ user: userId })
        .select("title progress status dueDate")
        .sort({ updatedAt: -1 });

      sendResponse(res, 200, true, "Progress fetched successfully", { goals });
    } catch (error) {
      logger.error(`Error fetching progress for user ${userId}:`, error);
      sendResponse(res, 500, false, "Failed to fetch progress");
    }
  },
);

/**
 * @desc Update progress for a goal
 * @route PUT /api/progress/update
 * @access Private
 */
export const updateProgress = catchAsync(
  async (
    req: Request<{}, {}, { goalId: string; progress: number }>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;
    const { goalId, progress } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, "User not authenticated");
      return;
    }

    if (progress < 0 || progress > 100) {
      sendResponse(res, 400, false, "Progress must be between 0 and 100");
      return;
    }

    try {
      const goal = await Goal.findOneAndUpdate(
        { _id: goalId, user: userId },
        { progress },
        { new: true, runValidators: true },
      );

      if (!goal) {
        sendResponse(res, 404, false, "Goal not found");
        return;
      }

      sendResponse(
        res,
        200,
        true,
        "Progress updated successfully",
        { goal },
      );
    } catch (error) {
      logger.error(`Error updating progress for goal ${goalId}:`, error);
      sendResponse(res, 500, false, "Failed to update progress");
    }
  },
);

/**
 * @desc Reset all progress for a user
 * @route DELETE /api/progress/reset
 * @access Private
 */
export const resetProgress = catchAsync(
  async (req: Request<{}, {}, {}, {}>, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 401, false, "User not authenticated");
      return;
    }

    try {
      const result = await Goal.updateMany(
        { user: userId },
        { progress: 0 },
      );

      sendResponse(
        res,
        200,
        true,
        "Progress reset successfully",
        { modifiedCount: result.modifiedCount },
      );
    } catch (error) {
      logger.error(`Error resetting progress for user ${userId}:`, error);
      sendResponse(res, 500, false, "Failed to reset progress");
    }
  },
);
