import Streak from "../models/Streak";
import { logger } from "../../utils/winstonLogger";

/**
 * Calculate the leaderboard rankings based on the streak count of users.
 * This method fetches all users' streaks and sorts them based on streak count in descending order.
 * 
 * @param {number} limit - The number of leaderboard entries to return.
 * @param {number} page - The page number for pagination.
 * @returns {Promise<{streaks: Document[], totalPages: number, totalEntries: number}>} - The leaderboard data with pagination.
 */
export const calculateLeaderboard = async (
  limit: number,
  page: number
): Promise<{
  streaks: Document[],
  totalPages: number,
  totalEntries: number
}> => {
  try {
    const streaks = await Streak.find()
      .sort({ streakCount: -1, lastCheckIn: -1 }) // Improved sorting
      .skip((page - 1) * limit)
      .limit(limit)
      .lean() // Optimize performance
      .populate("user", "username profilePicture");

    const totalEntries = await Streak.countDocuments();
    const totalPages = Math.ceil(totalEntries / limit);

    return {
      streaks: streaks as unknown as Document[],
      totalPages,
      totalEntries,
    };
  } catch (error) {
    logger.error(`❌ Error calculating leaderboard: ${(error as Error).message}`);
    throw new Error("Error calculating leaderboard");
  }
};


/**
 * Update the leaderboard entry for a user when their streak count changes.
 * 
 * @param {string} userId - The user ID to update.
 * @param {number} newStreakCount - The new streak count for the user.
 * @returns {Promise<void>} - A promise that resolves once the leaderboard entry is updated.
 */
export const updateLeaderboard = async (userId: string, newStreakCount: number): Promise<void> => {
  try {
    // Find the streak entry for the user
    const streak = await Streak.findOne({ user: userId });
  
    if (streak) {
      // Update the streak count and save the changes
      streak.streakCount = newStreakCount;
      await streak.save();
      logger.info(`✅ Leaderboard updated for user: ${userId} with streak count: ${newStreakCount}`);
    } else {
      logger.warn(`⚠️ No streak found for user: ${userId}`);
    }
  } catch (error) {
    logger.error(`❌ Error updating leaderboard for user ${userId}: ${(error as Error).message}`);
    throw new Error("Error updating leaderboard");
  }
};

/**
 * Reset the leaderboard for all users (this will reset their streak counts).
 * 
 * @returns {Promise<void>} - A promise that resolves once the leaderboard is reset for all users.
 */
export const resetLeaderboard: () => Promise<void> = async () => {
  try {
    // Reset all streaks to zero
    await Streak.updateMany({}, { streakCount: 0, lastCheckIn: null });
    logger.info(" Leaderboard reset for all users");
  } catch (error) {
    logger.error(` Error resetting leaderboard: ${(error as Error).message}`);
    throw new Error("Error resetting leaderboard");
  }
};
