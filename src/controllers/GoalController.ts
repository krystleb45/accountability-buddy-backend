import type { Request, Response, NextFunction } from "express";
import Goal from "../models/Goal";
import User, { IUser } from "../models/User";
import Achievement from "../models/Achievement";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import { Types } from "mongoose";

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
    password(currentPassword: any, password: any): unknown;
  };
}

/**
 * @desc    Update a goal
 * @route   PUT /api/goals/:goalId
 * @access  Private
 */
export const updateGoal = catchAsync(
  async (
    req: Request<GoalParams, {}, UpdateGoalBody> & RequestWithUser,
    res: Response,
    next: NextFunction
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
  }
);

/**
 * @desc    Get public goals
 * @route   GET /api/goals/public
 * @access  Public
 */
export const getPublicGoals = catchAsync(
  async (
    req: Request<{}, {}, {}, QueryWithPagination>,
    res: Response,
    _next: NextFunction
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
  }
);

/**
 * @desc Check if user qualifies for a new streak achievement
 * @param user - The user object
 */
const checkStreakAchievements = async (user: IUser): Promise<void> => {
  const streakAchievements = await Achievement.find({ name: /streak/i });

  for (const achievement of streakAchievements) {
    user.achievements = user.achievements ?? [];

    const achievementId = new Types.ObjectId(achievement._id as string);
    if (
      !user.achievements.includes(achievementId) &&
      user.streak !== null &&
      user.streak !== undefined &&
      user.streak >= achievement.requirements
    ) {
      user.achievements.push(achievementId);
      await user.save();
    }
  }
};

/**
 * @desc    Mark a goal as completed
 * @route   PATCH /api/goals/:goalId/complete
 * @access  Private
 */
export const markGoalAsCompleted = catchAsync(
  async (req: Request<GoalParams> & RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
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

    // ✅ Fetch user and update streak
    const user = await User.findById(userId);
    if (user) {
      const lastCompleted = user.lastGoalCompletedAt ? new Date(user.lastGoalCompletedAt) : null;
      const now = new Date();
      const oneDay = 1000 * 60 * 60 * 24;

      if (lastCompleted && now.getTime() - lastCompleted.getTime() <= oneDay) {
        user.streak = (user.streak ?? 0) + 1;
      } else {
        user.streak = 1;
      }

      user.completedGoals = (user.completedGoals ?? 0) + 1;
      user.lastGoalCompletedAt = now;
      await user.save();

      // ✅ Check for Streak Achievements
      await checkStreakAchievements(user);
    }

    sendResponse(res, 200, true, "Goal marked as completed successfully", { goal });
  }
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
    next: NextFunction
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

    goal.reminders = goal.reminders || [];
    goal.reminders.push({
      message,
      remindAt,
      status: "pending",
    });

    await goal.save();

    sendResponse(res, 200, true, "Reminder set successfully", { goal });
  }
);

/**
 * @desc    Get leaderboard of top goal achievers
 * @route   GET /api/leaderboard
 * @access  Public
 */
export const getLeaderboard = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const topUsers = await User.find()
      .sort({ completedGoals: -1 })
      .limit(10)
      .select("username profilePicture completedGoals");

    sendResponse(res, 200, true, "Leaderboard retrieved successfully", { topUsers });
  }
);

/**
 * @desc    Get user goals
 * @route   GET /api/goals
 * @access  Private
 */
export const getUserGoals = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    const goals = await Goal.find({ user: userId }).sort({ createdAt: -1 });

    sendResponse(res, 200, true, "User goals fetched successfully", { goals });
  }
);
/**
 * @desc    Delete a goal
 * @route   DELETE /api/goals/:goalId
 * @access  Private
 */
export const deleteGoal = catchAsync(
  async (req: Request<GoalParams> & RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
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
  }
);
/**
 * @desc    Create a new goal
 * @route   POST /api/goals
 * @access  Private
 */
export const createGoal = catchAsync(
  async (req: Request<{}, {}, CreateGoalBody> & RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
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
  }
);
/**
 * @desc    Get streak analytics for a user
 * @route   GET /api/goals/streak
 * @access  Private
 */
export const getStreakAnalytics = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      return next(createError("Unauthorized access", 401));
    }

    const user = await User.findById(userId).select("streak lastGoalCompletedAt achievements");

    if (!user) {
      return next(createError("User not found", 404));
    }

    sendResponse(res, 200, true, "Streak analytics fetched successfully", {
      streak: user.streak,
      lastGoalCompletedAt: user.lastGoalCompletedAt,
      achievements: user.achievements,
    });
  }
);
export default {
  createGoal,
  getUserGoals,
  updateGoal,
  deleteGoal,
  markGoalAsCompleted,
  getPublicGoals,
  setReminder,
  getLeaderboard,
  getStreakAnalytics,
};
