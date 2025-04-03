import type { Request, Response } from "express";
import mongoose, { SortOrder } from "mongoose";
import { User } from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import bcrypt from "bcryptjs";
import { subDays } from "date-fns";
import Goal from "../models/Goal";
import Streak from "../models/Streak";


export const getUserProfile = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }
  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }
  sendResponse(res, 200, true, "User profile fetched successfully.", { user });
});

export const getLeaderboard = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const sortBy = (req.query.sortBy as "xp" | "goals" | "streaks") || "xp";
  const timeRange = (req.query.timeRange as "week" | "month" | "all") || "all";
  const now = new Date();
  let filter: Record<string, any> = {};

  if (timeRange === "week") {
    filter.updatedAt = { $gte: subDays(now, 7) };
  } else if (timeRange === "month") {
    filter.updatedAt = { $gte: subDays(now, 30) };
  }

  let sortCriteria: Record<string, SortOrder> = {};
  if (sortBy === "xp") sortCriteria.points = -1;
  else if (sortBy === "goals") sortCriteria.completedGoals = -1;
  else if (sortBy === "streaks") sortCriteria.streakCount = -1;

  const topUsers = await User.find(filter)
    .sort(sortCriteria)
    .limit(10)
    .select("username points completedGoals streakCount profilePicture");

  sendResponse(res, 200, true, "Leaderboard fetched successfully", { leaderboard: topUsers });
});

export const changePassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select("+password");
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    sendResponse(res, 400, false, "Current password is incorrect.");
    return;
  }
  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();
  sendResponse(res, 200, true, "Password updated successfully.");
});

export const deleteUserAccount = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }
  const user = await User.findByIdAndDelete(req.user.id);
  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }
  sendResponse(res, 200, true, "Account deleted successfully.");
});

export const pinGoal = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }
  const { goalId } = req.body;
  if (!mongoose.isValidObjectId(goalId)) {
    sendResponse(res, 400, false, "Invalid Goal ID format.");
    return;
  }
  const user = await User.findById(req.user.id);
  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }
  if (user.pinnedGoals.includes(goalId)) {
    sendResponse(res, 400, false, "Goal is already pinned.");
    return;
  }
  user.pinnedGoals.push(new mongoose.Types.ObjectId(goalId));
  await user.save();
  sendResponse(res, 200, true, "Goal pinned successfully.", { pinnedGoals: user.pinnedGoals });
});

export const unpinGoal = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }
  const { goalId } = req.body;
  if (!mongoose.isValidObjectId(goalId)) {
    sendResponse(res, 400, false, "Invalid Goal ID format.");
    return;
  }
  const user = await User.findById(req.user.id);
  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }
  user.pinnedGoals = user.pinnedGoals.filter((id: { toString: () => any; }) => id.toString() !== goalId.toString());
  await user.save();
  sendResponse(res, 200, true, "Goal unpinned successfully.", { pinnedGoals: user.pinnedGoals });
});

export const featureAchievement = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }
  const { achievementId } = req.body;
  if (!mongoose.isValidObjectId(achievementId)) {
    sendResponse(res, 400, false, "Invalid Achievement ID format.");
    return;
  }
  const user = await User.findById(req.user.id);
  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }
  if (user.featuredAchievements.includes(achievementId)) {
    sendResponse(res, 400, false, "Achievement is already featured.");
    return;
  }
  user.featuredAchievements.push(new mongoose.Types.ObjectId(achievementId));
  await user.save();
  sendResponse(res, 200, true, "Achievement featured successfully.", { featuredAchievements: user.featuredAchievements });
});

export const unfeatureAchievement = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }
  const { achievementId } = req.body;
  if (!mongoose.isValidObjectId(achievementId)) {
    sendResponse(res, 400, false, "Invalid Achievement ID format.");
    return;
  }
  const user = await User.findById(req.user.id);
  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }
  user.featuredAchievements = user.featuredAchievements.filter((id: { toString: () => any; }) => id.toString() !== achievementId.toString());
  await user.save();
  sendResponse(res, 200, true, "Achievement unfeatured successfully.", { featuredAchievements: user.featuredAchievements });
});

export const getPinnedGoals = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }
  const user = await User.findById(req.user.id).populate("pinnedGoals");
  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }
  sendResponse(res, 200, true, "Pinned goals retrieved successfully.", { pinnedGoals: user.pinnedGoals });
});
export const updateUserProfile = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }

  const userId = req.user.id;
  const updates = req.body;

  const updatedUser = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!updatedUser) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }

  sendResponse(res, 200, true, "User profile updated successfully.", { updatedUser });
});

export const getFeaturedAchievements = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }
  const user = await User.findById(req.user.id).populate("featuredAchievements");
  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }
  sendResponse(res, 200, true, "Featured achievements retrieved successfully.", { featuredAchievements: user.featuredAchievements });
});
/**
 * @desc Get full user statistics (profile + goals + streak)
 * @route GET /users/:userId/statistics
 * @access Private
 */
export const getUserStatistics = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId;

  if (!mongoose.isValidObjectId(userId)) {
    sendResponse(res, 400, false, "Invalid user ID format.");
    return;
  }

  // 1. Fetch core user fields (omit password and sensitive info)
  const user = await User.findById(userId).select(
    "username profilePicture points completedGoals streakCount createdAt subscriptionTier subscription_status"
  );

  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }

  // 2. Fetch current streak from Streak model (for accuracy)
  const streakDoc = await Streak.findOne({ user: userId });
  const currentStreak = streakDoc?.streakCount || 0;

  // 3. Fetch goal status counts and completed milestones
  const [totalGoals, completedGoals, inProgressGoals, notStartedGoals, archivedGoals, milestoneAgg] = await Promise.all([
    Goal.countDocuments({ user: userId }),
    Goal.countDocuments({ user: userId, status: "completed" }),
    Goal.countDocuments({ user: userId, status: "in-progress" }),
    Goal.countDocuments({ user: userId, status: "not-started" }),
    Goal.countDocuments({ user: userId, status: "archived" }),
    Goal.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$milestones" },
      { $match: { "milestones.completed": true } },
      { $count: "completedMilestones" }
    ])
  ]);

  const completedMilestones = milestoneAgg?.[0]?.completedMilestones || 0;

  // 4. Format and return response
  sendResponse(res, 200, true, "User statistics fetched successfully.", {
    stats: {
      username: user.username,
      profilePicture: user.profilePicture,
      memberSince: user.createdAt,
      points: user.points,
      completedGoals: user.completedGoals,
      streakCount: currentStreak,
      subscription: {
        tier: user.subscriptionTier,
        status: user.subscription_status
      },
      goals: {
        total: totalGoals,
        completed: completedGoals,
        inProgress: inProgressGoals,
        notStarted: notStartedGoals,
        archived: archivedGoals
      },
      completedMilestones
    }
  });
});