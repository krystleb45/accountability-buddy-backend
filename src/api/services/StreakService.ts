// src/api/services/StreakService.ts
import mongoose from "mongoose";
import Streak, { IStreak } from "../models/Streak";
import { logger } from "../../utils/winstonLogger";

export interface LeaderboardResult {
  streaks: IStreak[];
  pagination: {
    totalEntries: number;
    currentPage: number;
    totalPages: number;
  };
}

export const getUserStreak = async (userId: string): Promise<IStreak> => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new Error("Invalid User ID format.");
  }
  const streak = await Streak.findOne({ user: userId }).populate("user", "username");
  if (!streak) {
    throw new Error("Streak not found for this user.");
  }
  return streak;
};

export const logDailyCheckIn = async (userId: string): Promise<IStreak> => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new Error("Invalid User ID format.");
  }

  let streak = await Streak.findOne({ user: userId });

  if (!streak) {
    streak = await Streak.create({ user: userId, lastCheckIn: new Date(), streakCount: 1 });
    logger.info(`✅ New streak started for user ${userId}`);
    return streak;
  }

  const last = streak.lastCheckIn?.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  if (last === today) {
    throw new Error("You have already checked in today.");
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  streak.streakCount = (last === yesterday) ? streak.streakCount + 1 : 1;
  streak.lastCheckIn = new Date();
  await streak.save();
  logger.info(`✅ Streak updated for user ${userId}: ${streak.streakCount} days`);
  return streak;
};

export const resetUserStreak = async (userId: string): Promise<void> => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new Error("Invalid User ID format.");
  }
  const streak = await Streak.findOne({ user: userId });
  if (!streak) {
    throw new Error("No streak found for this user.");
  }
  streak.streakCount = 0;
  streak.lastCheckIn = null;
  await streak.save();
  logger.info(`✅ Streak reset for user: ${userId}`);
};

export const getStreakLeaderboard = async (
  limit: number,
  page: number
): Promise<LeaderboardResult> => {
  const skip = (page - 1) * limit;
  const [streaks, totalEntries] = await Promise.all([
    Streak.find()
      .sort({ streakCount: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username profilePicture")
      .lean()
      .exec(),
    Streak.countDocuments(),
  ]);
  const totalPages = Math.ceil(totalEntries / limit);
  return { streaks, pagination: { totalEntries, currentPage: page, totalPages } };
};
