import { Request, Response, NextFunction } from "express";
import Goal from "../models/Goal";  // Correct path
import { IUser, User } from "../models/User";  // Correct path
import Badge from "../models/Badge";
import { Types } from "mongoose";
import { checkStreakMilestone } from "../utils/streakUtils";
import sendResponse from "../utils/sendResponse";
import createError from "../utils/errorUtils"; // Make sure this is from errorUtils.ts
import catchAsync from "../utils/catchAsync";
import { RequestWithUser } from "../types/RequestWithUser";
import { logger } from "../../utils/winstonLogger"; // Logger import

// Define query params interface
interface GoalQueryParams {
  page?: string;
  limit?: string;
}

export const getAllGoals = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user?.isAdmin) {
      return next(createError("Access denied. Admins only.", 403));  // 3 arguments: message, statusCode, details
    }

    const { page = "1", limit = "10" } = req.query as GoalQueryParams;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const goals = await Goal.find().sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));

    logger.info(`Fetched all goals, page: ${page}, limit: ${limit}`); // Log goal retrieval

    sendResponse(res, 200, true, "All goals fetched successfully", { goals });
  }
);

/**
 * @desc    Get all goal completion dates for streak calendar
 * @route   GET /api/goals/streak-dates
 * @access  Private
 */
export const getStreakDates = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) return next(createError("Unauthorized access", 401));

    const completedGoals = await Goal.find({
      user: userId,
      completedAt: { $exists: true },
    }).select("completedAt");

    const dates = completedGoals.map(goal => goal.completedAt?.toISOString().split("T")[0]);

    logger.info(`Fetched streak dates for user ${userId}`); // Log streak date retrieval

    sendResponse(res, 200, true, "Goal streak dates fetched", { dates });
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

    logger.info(`Created new goal for user ${userId}, title: "${title}"`); // Log goal creation

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

    logger.info(`Updated progress for goal ${goalId} to ${progress}% for user ${userId}`); // Log progress update

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

    goal.completedAt = new Date();
    await goal.save();

    // 🔥 STREAK LOGIC & BONUS XP
    const user = (await User.findById(userId)) as IUser;
    if (!user) return next(createError("User not found", 404));

    user.streakCount = (user.streakCount ?? 0) + 1;
    const currentStreak = user.streakCount;

    // ✅ Check milestone logic
    const { badgeId, bonusXP } = checkStreakMilestone(currentStreak);

    // ✅ Award milestone badge if not already owned
    if (badgeId) {
      const alreadyHasBadge = user.badges?.some(
        (badgeEntry: Types.ObjectId | string) => badgeEntry.toString() === badgeId
      );

      if (!alreadyHasBadge) {
        const badge = await Badge.findOne({ _id: badgeId });
        if (badge) {
          user.badges = [...(user.badges ?? []), badge._id as Types.ObjectId];
        }
      }
    }

    // ✅ Award bonus XP if applicable
    if (bonusXP > 0) {
      user.points = (user.points ?? 0) + bonusXP;
    }

    await user.save();

    logger.info(`Goal ${goalId} completed by user ${userId}. Streak: ${currentStreak}, Bonus XP: ${bonusXP}`); // Log goal completion

    sendResponse(res, 200, true, "Goal marked as complete", {
      goal,
      newStreak: currentStreak,
      bonusXP,
    });
  }
);

/**
 * @desc    Get user's personal goals with pagination
 * @route   GET /api/goals/my-goals
 * @access  Private
 */
export const getUserGoals = catchAsync(
  async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) return next(createError("Unauthorized access", 401));

    const { page = "1", limit = "10" } = req.query as GoalQueryParams;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userGoals = await Goal.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));

    logger.info(`Fetched personal goals for user ${userId}, page: ${page}, limit: ${limit}`); // Log goal retrieval

    sendResponse(res, 200, true, "User goals fetched successfully", { goals: userGoals });
  }
);

/**
 * @desc    Get public goals with pagination
 * @route   GET /api/goals/public
 * @access  Public
 */
export const getPublicGoals = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const { page = "1", limit = "10" } = _req.query as GoalQueryParams;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const publicGoals = await Goal.find({ isPublic: true }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));

    logger.info(`Fetched public goals, page: ${page}, limit: ${limit}`); // Log public goal retrieval

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
  getStreakDates, // ✅ Add this here
};
