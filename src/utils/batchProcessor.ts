import mongoose from "mongoose";
import Badge from "../api/models/Badge";
import Leaderboard from "../api/models/Leaderboard";
import Goal from "../api/models/Goal";
import { logger } from "../utils/winstonLogger";

// Utility function to update leaderboard in bulk
export const updateLeaderboardInBulk = async (userId: mongoose.Types.ObjectId, points: number, goals: number, milestones: number, streak: number): Promise<void> => {
  try {
    const leaderboardUpdate = {
      $inc: {
        totalPoints: points,
        completedGoals: goals,
        completedMilestones: milestones,
        streakDays: streak,
      },
    };

    // Use `updateMany` if you need to update multiple leaderboard entries
    await Leaderboard.updateMany(
      { user: userId },
      leaderboardUpdate,
      { upsert: true, setDefaultsOnInsert: true }
    );

    logger.info(`Leaderboard updated in bulk for user: ${userId}`);
  } catch (error) {
    logger.error(`Error updating leaderboard in bulk for user ${userId}: ${(error as Error).message}`);
  }
};

// Utility function to update streak progress in bulk
export const updateStreakProgressInBulk = async (userId: mongoose.Types.ObjectId, streakIncrement: number): Promise<void> => {
  try {
    // Increase streak count in bulk
    await Goal.updateMany(
      { user: userId, status: "completed" },
      { $inc: { streakCount: streakIncrement } }
    );

    logger.info(`Streak progress updated in bulk for user: ${userId}`);
  } catch (error) {
    logger.error(`Error updating streak progress for user ${userId}: ${(error as Error).message}`);
  }
};

// Utility function to award badges in bulk
export const awardBadgesInBulk = async (userIds: mongoose.Types.ObjectId[], badgeType: string, level: string): Promise<void> => {
  try {
    const bulkOperations = userIds.map(userId => ({
      updateOne: {
        filter: { user: userId, badgeType },
        update: { $set: { badgeType, level } },
        upsert: true,
      },
    }));

    // Perform bulk update for badges
    if (bulkOperations.length > 0) {
      await Badge.bulkWrite(bulkOperations);
    }

    logger.info(`Badges awarded in bulk for users: ${userIds.join(", ")}`);
  } catch (error) {
    logger.error(`Error awarding badges in bulk: ${(error as Error).message}`);
  }
};

// Utility function to process batch updates for badges and leaderboard
export const processBatchUpdates = async (userIds: mongoose.Types.ObjectId[], points: number, goals: number, milestones: number, streak: number, badgeType: string, level: string): Promise<void> => {
  try {
    // Update leaderboard in bulk
    await updateLeaderboardInBulk(userIds[0], points, goals, milestones, streak); // Example: userIds[0] as an example user to update leaderboard

    // Award badges in bulk
    await awardBadgesInBulk(userIds, badgeType, level);

    // Update streak progress in bulk
    await updateStreakProgressInBulk(userIds[0], streak); // Example: userIds[0] as an example user to update streaks

    logger.info(`Batch updates processed for users: ${userIds.join(", ")}`);
  } catch (error) {
    logger.error(`Error processing batch updates: ${(error as Error).message}`);
  }
};
