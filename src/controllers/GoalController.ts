import type { Request, Response, NextFunction } from "express";
import Goal from "../models/Goal";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

// Define reusable types
type GoalParams = { goalId: string };
type CreateGoalBody = { title: string; description?: string; dueDate: string };
type UpdateGoalBody = { title?: string; description?: string; dueDate?: string; progress?: number };
type ReminderBody = { goalId: string; message: string; remindAt: string };
type QueryWithPagination = { page?: string; limit?: string };


// Extend the request type to include the user property
interface RequestWithUser extends Request {
  user?: {
    id: string;
    email?: string;
    role: "user" | "admin" | "moderator";
    isAdmin?: boolean;
    password(currentPassword: any, password: any): unknown; // Ensure password method matches project definitions
  };
}
/**
 * @desc    Update goal progress
 * @route   PUT /goal/:goalId/progress
 * @access  Private
 */
export const updateGoalProgress = catchAsync(
  async (
    req: Request<GoalParams, {}, { progress: number }> & RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { goalId } = req.params;
    const { progress } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    if (progress < 0 || progress > 100) {
      return next(createError("Progress must be between 0 and 100", 400));
    }

    const goal = await Goal.findOne({ _id: goalId, user: userId });

    if (!goal) {
      return next(createError("Goal not found or access denied", 404));
    }

    goal.progress = progress;
    await goal.save();

    sendResponse(res, 200, true, "Goal progress updated successfully", { goal });
  },
);

/**
 * @desc    Mark a goal as complete
 * @route   PUT /goal/:goalId/complete
 * @access  Private
 */
export const completeGoal = catchAsync(
  async (
    req: Request<GoalParams> & RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { goalId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    const goal = await Goal.findOne({ _id: goalId, user: userId });

    if (!goal) {
      return next(createError("Goal not found or access denied", 404));
    }

    goal.status = "completed";
    goal.completedAt = new Date();
    await goal.save();

    sendResponse(res, 200, true, "Goal marked as complete successfully", { goal });
  },
);

/**
 * @desc    Get analytics for user goals
 * @route   GET /goal/analytics
 * @access  Private
 */
export const getAnalytics = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    const totalGoals = await Goal.countDocuments({ user: userId });
    const completedGoals = await Goal.countDocuments({ user: userId, status: "completed" });
    const inProgressGoals = totalGoals - completedGoals;

    sendResponse(res, 200, true, "Goal analytics fetched successfully", {
      analytics: {
        totalGoals,
        completedGoals,
        inProgressGoals,
      },
    });
  },
);

/**
 * @desc    Set a reminder for a goal
 * @route   POST /goal/reminders
 * @access  Private
 */
export const setReminder = catchAsync(
  async (
    req: Request<{}, {}, ReminderBody> & RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { goalId, message, remindAt } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    if (!message || !remindAt) {
      return next(createError("Message and reminder time are required", 400));
    }

    const goal = await Goal.findOne({ _id: goalId, user: userId });

    if (!goal) {
      return next(createError("Goal not found or access denied", 404));
    }

    // Assume there's a reminders array or a separate Reminder model
    goal.reminders = goal.reminders || [];
    goal.reminders.push({ message, remindAt });
    await goal.save();

    sendResponse(res, 200, true, "Reminder set successfully", { goal });
  },
);
/**
 * @desc    Create a new goal
 * @route   POST /api/goals
 * @access  Private
 */
export const createGoal = catchAsync(
  async (
    req: Request<{}, {}, CreateGoalBody> & RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { title, description, dueDate } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    if (!title || !dueDate) {
      return next(createError("Title and due date are required", 400));
    }

    if (new Date(dueDate) <= new Date()) {
      return next(createError("Due date must be in the future", 400));
    }

    const newGoal = await Goal.create({
      title,
      description,
      dueDate,
      user: userId,
    });

    sendResponse(res, 201, true, "Goal created successfully", { goal: newGoal });
  },
);

/**
 * @desc    Get user goals
 * @route   GET /api/goals
 * @access  Private
 */
export const getUserGoals = catchAsync(
  async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    const goals = await Goal.find({ user: userId }).sort({ createdAt: -1 });

    sendResponse(res, 200, true, "User goals fetched successfully", { goals });
  },
);

/**
 * @desc    Update a goal
 * @route   PUT /api/goals/:goalId
 * @access  Private
 */
export const updateGoal = catchAsync(
  async (
    req: Request<GoalParams, {}, UpdateGoalBody> & RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { goalId } = req.params;
    const updates = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    const goal = await Goal.findOne({ _id: goalId, user: userId });

    if (!goal) {
      return next(createError("Goal not found or access denied", 404));
    }

    Object.assign(goal, updates);
    await goal.save();

    sendResponse(res, 200, true, "Goal updated successfully", { goal });
  },
);

/**
 * @desc    Delete a goal
 * @route   DELETE /api/goals/:goalId
 * @access  Private
 */
export const deleteGoal = catchAsync(
  async (
    req: Request<GoalParams> & RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { goalId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    const goal = await Goal.findOneAndDelete({ _id: goalId, user: userId });

    if (!goal) {
      return next(createError("Goal not found or access denied", 404));
    }

    sendResponse(res, 200, true, "Goal deleted successfully");
  },
);

/**
 * @desc    Mark a goal as completed
 * @route   PATCH /api/goals/:goalId/complete
 * @access  Private
 */
export const markGoalAsCompleted = catchAsync(
  async (
    req: Request<GoalParams> & RequestWithUser,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { goalId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    const goal = await Goal.findOne({ _id: goalId, user: userId });

    if (!goal) {
      return next(createError("Goal not found or access denied", 404));
    }

    goal.status = "completed";
    goal.completedAt = new Date();
    await goal.save();

    sendResponse(res, 200, true, "Goal marked as completed successfully", { goal });
  },
);

/**
 * @desc    Get public goals
 * @route   GET /goal/public
 * @access  Public
 */
export const getPublicGoals = catchAsync(
  async (
    req: Request<{}, {}, {}, QueryWithPagination>,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);

    const publicGoals = await Goal.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalGoals = await Goal.countDocuments({ isPublic: true });

    sendResponse(res, 200, true, "Public goals fetched successfully", {
      publicGoals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalGoals / limit),
        totalGoals,
      },
    });
  },
);

export default {
  createGoal,
  getUserGoals,
  updateGoal,
  deleteGoal,
  updateGoalProgress,
  completeGoal,
  getAnalytics,
  setReminder,
};
