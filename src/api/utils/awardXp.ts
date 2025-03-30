import { User } from "../models/User";
import Badge from "../models/Badge";
import type { BadgeType, BadgeLevel } from "../models/Badge";
import mongoose from "mongoose";

/**
 * ➕ Award XP to a user
 */
export const awardXp = async (userId: string | mongoose.Types.ObjectId, amount: number): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.points = (user.points || 0) + amount;
  await user.save();
};

/**
 * 🏅 Award or update badge progress
 */
export const awardOrUpdateBadge = async (
  userId: string | mongoose.Types.ObjectId,
  badgeType: BadgeType,
  defaultLevel: BadgeLevel = "Bronze",
  goal: number = 3,
  pointsRewarded: number = 25
): Promise<void> => {
  const existing = await Badge.findOne({ user: userId, badgeType });

  if (existing) {
    existing.progress += 1;
    if (existing.progress >= existing.goal) {
      existing.level = Badge.getNextLevel(existing.level);
      existing.progress = 0;
    }
    await existing.save();
  } else {
    const newBadge = new Badge({
      user: userId,
      badgeType,
      level: defaultLevel,
      progress: 1,
      goal,
      pointsRewarded,
      isShowcased: false,
    });
    await newBadge.save();
  }
};

/**
 * 🧠 Utility to reward user for completing a challenge
 */
export const rewardUserForChallengeCompletion = async (userId: string | mongoose.Types.ObjectId): Promise<void> => {
  await awardXp(userId, 50); // Example: +50 XP
  await awardOrUpdateBadge(userId, "milestone_achiever", "Bronze", 3, 25);
};
