// src/api/controllers/GoalController.ts
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import GoalManagementService from "../services/GoalManagementService";

export const createGoal = catchAsync(
  async (
    req: Request<{}, {}, { title: string; description?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      return next(createError("Unauthorized", 401));
    }

    const { title, description } = req.body;
    if (!title) {
      return next(createError("Title is required", 400));
    }

    const goal = await GoalManagementService.createGoal(userId, {
      title,
      description,
    });

    sendResponse(res, 201, true, "Goal created successfully", { goal });
  }
);

export const getPublicGoals = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const goals = await GoalManagementService.getPublicGoals();
    sendResponse(res, 200, true, "Public goals retrieved successfully", {
      goals,
    });
  }
);

export const getUserGoals = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      return next(createError("Unauthorized", 401));
    }

    const goals = await GoalManagementService.getUserGoals(userId);
    sendResponse(res, 200, true, "User goals retrieved successfully", {
      goals,
    });
  }
);

export const getStreakDates = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      return next(createError("Unauthorized", 401));
    }

    const dates = await GoalManagementService.getStreakDates(userId);
    sendResponse(res, 200, true, "Streak dates fetched successfully", {
      dates,
    });
  }
);

export const updateGoalProgress = catchAsync(
  async (
    req: Request<{ goalId: string }, {}, { progress: number }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { goalId } = req.params;
    if (!mongoose.isValidObjectId(goalId)) {
      return next(createError("Invalid goal ID", 400));
    }

    const userId = req.user?.id!;
    const goal = await GoalManagementService.trackProgress(
      goalId,
      userId,
      req.body.progress
    );
    sendResponse(res, 200, true, "Goal progress updated", { goal });
  }
);

export const completeGoal = catchAsync(
  async (
    req: Request<{ goalId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { goalId } = req.params;
    if (!mongoose.isValidObjectId(goalId)) {
      return next(createError("Invalid goal ID", 400));
    }

    const userId = req.user?.id!;
    const goal = await GoalManagementService.completeGoal(goalId, userId);
    sendResponse(res, 200, true, "Goal marked as complete", { goal });
  }
);

export default {
  createGoal,
  getPublicGoals,
  getUserGoals,
  getStreakDates,
  updateGoalProgress,
  completeGoal,
};
