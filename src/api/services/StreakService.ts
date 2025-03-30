import Streak from "../models/Streak";
import { logger } from "../../utils/winstonLogger";
import mongoose from "mongoose";

/**
 * Log a daily check-in for the user, incrementing their streak.
 * If the user has not checked in, it starts a new streak.
 *
 * @param {string} userId - The user ID to log the check-in for.
 * @returns {Promise<any>} - The updated streak data.
 */
export const logDailyCheckIn = async (userId: string): Promise<any> => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw new Error("Invalid User ID format.");
    }

    // Find the user's streak data
    let streak = await Streak.findOne({ user: userId });

    // If no streak record, create a new one
    if (!streak) {
      streak = new Streak({
        user: userId,
        lastCheckIn: new Date(),
        streakCount: 1,
      });
      await streak.save();
      logger.info(`✅ New streak started for user ${userId}`);
      return streak;
    } else {
      const lastCheckInDate = streak.lastCheckIn?.toISOString().split("T")[0];
      const todayDate = new Date().toISOString().split("T")[0];

      // If the user has already checked in today
      if (lastCheckInDate === todayDate) {
        throw new Error("You have already checked in today.");
      }

      // If the user checked in yesterday, increment the streak
      const isYesterday =
        lastCheckInDate &&
        new Date(lastCheckInDate).getDate() === new Date(Date.now() - 86400000).getDate();

      if (isYesterday) {
        streak.streakCount += 1; // Increment the streak count
      } else {
        streak.streakCount = 1; // Reset streak if the user missed a day
      }

      streak.lastCheckIn = new Date(); // Update last check-in to today
      await streak.save();
      logger.info(`✅ Streak updated for user ${userId}: ${streak.streakCount} days`);
      return streak;
    }
  } catch (error) {
    logger.error(`❌ Error logging daily check-in for user ${userId}: ${(error as Error).message}`);
    throw new Error("Error logging daily check-in");
  }
};

/**
 * Reset the user's streak (Admin only).
 *
 * @param {string} userId - The user ID to reset the streak for.
 * @returns {Promise<void>} - A promise that resolves when the streak is reset.
 */
export const resetUserStreak = async (userId: string): Promise<void> => {
  try {
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
  } catch (error) {
    logger.error(`❌ Error resetting streak for user ${userId}: ${(error as Error).message}`);
    throw new Error("Error resetting streak");
  }
};

/**
 * Get the user's streak details.
 *
 * @param {string} userId - The user ID to get the streak details for.
 * @returns {Promise<any>} - The streak details for the user.
 */
export const getUserStreak = async (userId: string): Promise<any> => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw new Error("Invalid User ID format.");
    }

    const streak = await Streak.findOne({ user: userId }).populate("user", "username");

    if (!streak) {
      throw new Error("Streak not found for this user.");
    }

    return streak;
  } catch (error) {
    logger.error(`❌ Error fetching streak for user ${userId}: ${(error as Error).message}`);
    throw new Error("Error fetching streak");
  }
};

/**
 * Get the streak leaderboard (top users based on streak count).
 *
 * @param {number} limit - The number of leaderboard entries to fetch.
 * @param {number} page - The page number for pagination.
 * @returns {Promise<any>} - The streak leaderboard.
 */
export const getStreakLeaderboard = async (limit: number, page: number): Promise<any> => {
  try {
    const skip = (page - 1) * limit;

    const streaks = await Streak.find()
      .sort({ streakCount: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username profilePicture");

    const totalEntries = await Streak.countDocuments();
    const totalPages = Math.ceil(totalEntries / limit);

    return {
      streaks,
      pagination: {
        totalEntries,
        currentPage: page,
        totalPages,
      },
    };
  } catch (error) {
    logger.error(`❌ Error fetching streak leaderboard: ${(error as Error).message}`);
    throw new Error("Error fetching streak leaderboard");
  }
};
