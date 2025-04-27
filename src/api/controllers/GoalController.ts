// src/api/controllers/GoalController.ts
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Goal from "../models/Goal";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

/**
 * @desc    Create a new goal
 * @route   POST /api/goals/create
 * @access  Private (requires paid subscription)
 */
export const createGoal = catchAsync(
  async (
    req: Request<{}, {}, { title: string; target: number; category?: string }>,
    res: Response,
    next: NextFunction
  ) => {
    const userId = req.user?.id;
    if (!userId) {
      return next(createError("Unauthorized", 401));
    }

    const { title, target, category } = req.body;
    if (!title || typeof target !== "number") {
      return next(createError("Title and numeric target are required", 400));
    }

    const newGoal = await Goal.create({
      user: new mongoose.Types.ObjectId(userId),
      title,
      description: category,      // if you want to map category → description
      progress: 0,
      status: "not-started",
      milestones: [],
      tags: [],
      priority: "medium",
      isPinned: false,
      points: 0,
      dueDate: undefined,
      completedAt: undefined,
    });

    sendResponse(res, 201, true, "Goal created successfully", { goal: newGoal });
  }
);

/**
 * @desc    Get all public goals
 * @route   GET /api/goals/public
 * @access  Public
 */
export const getPublicGoals = catchAsync(async (_req, res: Response) => {
  // if you have a `visibility` field, you can filter by that; otherwise return all
  const goals = await Goal.find({ status: { $ne: "archived" } }).sort({ createdAt: -1 });
  sendResponse(res, 200, true, "Public goals retrieved successfully", { goals });
});

/**
 * @desc    Get all goals for the logged-in user
 * @route   GET /api/goals/my-goals
 * @access  Private
 */
export const getUserGoals = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) {
    return next(createError("Unauthorized", 401));
  }

  const goals = await Goal.find({ user: userId }).sort({ createdAt: -1 });
  sendResponse(res, 200, true, "User goals retrieved successfully", { goals });
});

/**
 * @desc    Get streak dates (all dates where user completed goals)
 * @route   GET /api/goals/streak-dates
 * @access  Private
 */
export const getStreakDates = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) {
    return next(createError("Unauthorized", 401));
  }

  const completedGoals = await Goal.find({
    user: userId,
    status: "completed",
    completedAt: { $exists: true }
  }).select("completedAt");

  const dates = completedGoals
    .map((g) => g.completedAt!)
    .sort((a, b) => a.getTime() - b.getTime())
    .map((d) => d.toISOString().slice(0, 10)); // YYYY-MM-DD

  sendResponse(res, 200, true, "Streak dates fetched successfully", { dates });
});

/** your existing two handlers below... */

/**
 * @desc    Update goal progress
 * @route   PUT /api/goals/:goalId/progress
 * @access  Private
 */
export const updateGoalProgress = catchAsync(
  async (
    req: Request<{ goalId: string }, {}, { progress: number }>,
    res: Response,
    next: NextFunction
  ) => {
    const { goalId } = req.params;
    if (!mongoose.isValidObjectId(goalId)) {
      return next(createError("Invalid goal ID", 400));
    }

    const goal = await Goal.findById(goalId);
    if (!goal) {
      return next(createError("Goal not found", 404));
    }
    if (goal.user.toString() !== req.user?.id) {
      return next(createError("Not authorized to update this goal", 403));
    }

    const { progress } = req.body;
    goal.progress = progress;

    if (progress >= 100) {
      goal.status = "completed";
      goal.completedAt = new Date();
    }

    await goal.save();
    sendResponse(res, 200, true, "Goal progress updated", { goal });
  }
);

/**
 * @desc    Mark a goal as complete
 * @route   PUT /api/goals/:goalId/complete
 * @access  Private
 */
export const completeGoal = catchAsync(
  async (req: Request<{ goalId: string }>, res: Response, next: NextFunction) => {
    const { goalId } = req.params;
    if (!mongoose.isValidObjectId(goalId)) {
      return next(createError("Invalid goal ID", 400));
    }

    const goal = await Goal.findById(goalId);
    if (!goal) {
      return next(createError("Goal not found", 404));
    }
    if (goal.user.toString() !== req.user?.id) {
      return next(createError("Not authorized to complete this goal", 403));
    }

    goal.progress = 100;
    goal.status = "completed";
    goal.completedAt = new Date();
    await goal.save();

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
