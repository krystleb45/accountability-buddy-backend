import type { Request, Response, NextFunction } from "express";
import Goal from "../models/Goal";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

// ✅ Extend Request Type for User
interface RequestWithUser<T = {}, U = {}> extends Request<U, {}, T> {
  user?: {
    id: string;
    email?: string;
    role: "user" | "admin" | "moderator";
    isAdmin?: boolean;
  };
}

/**
 * @desc    Get all goals (Admin Only)
 * @route   GET /api/goals
 * @access  Private (Admin)
 */
export const getAllGoals = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user?.isAdmin) return next(createError("Access denied. Admins only.", 403));

    const goals = await Goal.find().sort({ createdAt: -1 });

    sendResponse(res, 200, true, "All goals fetched successfully", { goals });
  }
);

/**
 * @desc    Create a new goal
 * @route   POST /api/goals/create
 * @access  Private (Requires Subscription)
 */
export const createGoal = catchAsync(
  async (req: RequestWithUser<{ title: string; description: string; dueDate?: string }>, res: Response, next: NextFunction): Promise<void> => {
    const { title, description, dueDate } = req.body;
    const userId = req.user?.id;

    if (!title || !description) return next(createError("Title and description are required", 400));
    if (!userId) return next(createError("Unauthorized access", 401));

    const newGoal = await Goal.create({ title, description, dueDate, user: userId });

    sendResponse(res, 201, true, "Goal created successfully", { goal: newGoal });
  }
);

/**
 * @desc    Update goal progress
 * @route   PUT /api/goals/:goalId/progress
 * @access  Private
 */
export const updateGoalProgress = catchAsync(
  async (req: RequestWithUser<{ progress: number }, { goalId: string }>, res: Response, next: NextFunction): Promise<void> => {
    const { goalId } = req.params;
    const { progress } = req.body;
    const userId = req.user?.id;

    if (!goalId || progress == null) return next(createError("Goal ID and progress are required", 400));
    if (!userId) return next(createError("Unauthorized access", 401));

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) return next(createError("Goal not found or not owned by user", 404));

    goal.progress = progress;
    await goal.save();

    sendResponse(res, 200, true, "Goal progress updated successfully", { goal });
  }
);

/**
 * @desc    Mark a goal as complete
 * @route   PUT /api/goals/:goalId/complete
 * @access  Private
 */
export const completeGoal = catchAsync(
  async (req: RequestWithUser<{}, { goalId: string }>, res: Response, next: NextFunction): Promise<void> => {
    const { goalId } = req.params;
    const userId = req.user?.id;

    if (!goalId) return next(createError("Goal ID is required", 400));
    if (!userId) return next(createError("Unauthorized access", 401));

    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) return next(createError("Goal not found or not owned by user", 404));

    goal.completedAt = new Date();    await goal.save();

    sendResponse(res, 200, true, "Goal marked as complete", { goal });
  }
);

/**
 * @desc    Get user's personal goals
 * @route   GET /api/goals/my-goals
 * @access  Private
 */
export const getUserGoals = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) return next(createError("Unauthorized access", 401));

    const userGoals = await Goal.find({ user: userId }).sort({ createdAt: -1 });

    sendResponse(res, 200, true, "User goals fetched successfully", { goals: userGoals });
  }
);

/**
 * @desc    Get public goals
 * @route   GET /api/goals/public
 * @access  Public
 */
export const getPublicGoals = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const publicGoals = await Goal.find({ isPublic: true }).sort({ createdAt: -1 });

    sendResponse(res, 200, true, "Public goals fetched successfully", { publicGoals });
  }
);

// ✅ Export all necessary functions for `goal.ts` router
export default {
  getAllGoals,
  createGoal,
  updateGoalProgress,
  completeGoal,
  getUserGoals,
  getPublicGoals,
};
