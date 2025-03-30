import Badge from "../models/Badge";
import { logger } from "../../utils/winstonLogger";
import { BadgeType, BadgeLevel } from "../models/Badge";
import Task from "../models/Task"; // Example for task completion, replace with your own model
import Milestone from "../models/Milestone";
import Goal from "../models/Goal";

/**
 * Award a badge to a user based on specific criteria (e.g., goal completion, streaks).
 *
 * @param {string} userId - The user ID to award the badge to.
 * @param {BadgeType} badgeType - The type of the badge to be awarded.
 * @returns {Promise<IBadge>} - The awarded badge.
 */
export const awardBadge = async (userId: string, badgeType: BadgeType): Promise<any> => {
  try {
    // Check if the user already has the badge
    const existingBadge = await Badge.findOne({ user: userId, badgeType });

    if (existingBadge) {
      // If the user already has the badge, update the progress and level
      existingBadge.progress += 1;

      if (existingBadge.progress >= 10) { // Example condition for upgrading the badge
        existingBadge.level = getNextBadgeLevel(existingBadge.level);
      }

      await existingBadge.save();
      logger.info(`✅ Badge updated for user ${userId}: ${badgeType}`);
      return existingBadge;
    }

    // If the user doesn't have the badge, create a new one
    const newBadge = new Badge({
      user: userId,
      badgeType,
      level: "Bronze", // Default badge level
      progress: 1, // Initial progress
      dateAwarded: new Date(),
      isShowcased: false,
      pointsRewarded: Badge.awardPointsForBadge(badgeType),
    });

    await newBadge.save();
    logger.info(`✅ New badge awarded to user ${userId}: ${badgeType}`);

    return newBadge;
  } catch (error) {
    logger.error(`❌ Error awarding badge to user ${userId}: ${(error as Error).message}`);
    throw new Error("Error awarding badge");
  }
};

/**
 * Get the next badge level based on the current level.
 *
 * @param {BadgeLevel} currentLevel - The current badge level.
 * @returns {BadgeLevel} - The next badge level.
 */
export const getNextBadgeLevel = (currentLevel: BadgeLevel): BadgeLevel => {
  const levels: BadgeLevel[] = ["Bronze", "Silver", "Gold"];
  const currentIndex = levels.indexOf(currentLevel);

  // If already at the highest level, return Gold.
  return levels[currentIndex + 1] || "Gold";
};

/**
 * Check if a user qualifies for a specific badge based on their actions (e.g., goals completed, streak count).
 *
 * @param {string} userId - The user ID to check.
 * @param {BadgeType} badgeType - The badge type to check if the user qualifies for.
 * @returns {Promise<boolean>} - Whether the user qualifies for the badge.
 */
export const checkBadgeEligibility = async (userId: string, badgeType: BadgeType): Promise<boolean> => {
  try {
    // Example conditions for badge eligibility (this can be customized)
    switch (badgeType) {
      case "goal_completed":
        // Check if the user has completed a certain number of goals
        const completedGoals = await Goal.countDocuments({ user: userId, status: "completed" });
        return completedGoals >= 10; // For example, require 10 completed goals
      case "helper":
        // Example: Check if the user has completed tasks (replace with your own logic)
        const completedTasks = await Task.countDocuments({ user: userId, status: "completed" });
        return completedTasks >= 5; // For example, require 5 tasks completed
      case "milestone_achiever":
        // Check if the user has reached a milestone (e.g., completing tasks within a specific time frame)
        const milestonesAchieved = await Milestone.countDocuments({ user: userId, status: "completed" });
        return milestonesAchieved >= 5; // For example, require 5 milestones completed
      default:
        return false;
    }
  } catch (error) {
    logger.error(`❌ Error checking badge eligibility for user ${userId}: ${(error as Error).message}`);
    throw new Error("Error checking badge eligibility");
  }
};

/**
 * Update the badge showcase (e.g., toggle whether the badge is visible in the user's profile).
 *
 * @param {string} userId - The user ID whose badge showcase is being updated.
 * @param {BadgeType} badgeType - The badge type to update the showcase for.
 * @param {boolean} isShowcased - Whether the badge should be showcased.
 * @returns {Promise<void>} - A promise that resolves once the badge showcase is updated.
 */
export const updateBadgeShowcase = async (userId: string, badgeType: BadgeType, isShowcased: boolean): Promise<void> => {
  try {
    const badge = await Badge.findOne({ user: userId, badgeType });

    if (!badge) {
      throw new Error("Badge not found for this user.");
    }

    badge.isShowcased = isShowcased;
    await badge.save();
    logger.info(`✅ Badge showcase updated for user ${userId}: ${badgeType}, Showcase: ${isShowcased}`);
  } catch (error) {
    logger.error(`❌ Error updating badge showcase for user ${userId}: ${(error as Error).message}`);
    throw new Error("Error updating badge showcase");
  }
};

/**
 * Remove expired badges (e.g., time-based badges that have expired).
 *
 * @returns {Promise<void>} - A promise that resolves once the expired badges are removed.
 */
export const removeExpiredBadges = async (): Promise<void> => {
  try {
    // Remove badges where the expiration date is in the past
    await Badge.deleteMany({ expiresAt: { $lt: new Date() } });
    logger.info("✅ Expired badges removed successfully");
  } catch (error) {
    logger.error(`❌ Error removing expired badges: ${(error as Error).message}`);
    throw new Error("Error removing expired badges");
  }
};
