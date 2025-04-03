import Goal from "../models/Goal";
import Challenge from "../models/Challenge";
import { User } from "../models/User"; // User model to track subscription data
import { logger } from "../../utils/winstonLogger";

/**
 * Utility function to log and handle errors.
 * @param error - The error object.
 * @param message - Custom error message.
 * @returns A fallback value.
 */
const handleError = <T>(error: unknown, message: string, fallback: T): T => {
  logger.error(`${message}: ${(error as Error).message}`);
  return fallback;
};

/**
 * @desc    Calculates the goal completion rate for a user.
 * @param   userId - The ID of the user.
 * @returns The completion rate (0 to 100).
 */
const calculateGoalCompletionRate = async (userId: string): Promise<number> => {
  try {
    const goals = await Goal.find({ userId }).lean(); // Use lean() for faster queries
    if (!goals.length) return 0;

    const completedGoals = goals.filter((goal) => goal.status === "completed").length;
    return (completedGoals / goals.length) * 100;
  } catch (error) {
    return handleError(error, `Error calculating goal completion rate for user ${userId}`, 0);
  }
};

/**
 * @desc    Calculates the challenge participation rate for a user.
 * @param   userId - The ID of the user.
 * @returns The participation rate (0 to 100).
 */
const calculateChallengeParticipationRate = async (userId: string): Promise<number> => {
  try {
    const challenges = await Challenge.find({ "participants.userId": userId }).lean();
    if (!challenges.length) return 0;

    const completedChallenges = challenges.filter((challenge) =>
      challenge.participants.some(
        (participant) => participant.user.toString() === userId && participant.progress >= 100,
      ),
    ).length;

    return (completedChallenges / challenges.length) * 100;
  } catch (error) {
    return handleError(error, `Error calculating challenge participation rate for user ${userId}`, 0);
  }
};

/**
 * @desc    Fetches subscription data for a user, including status, tier, and dates.
 * @param   userId - The ID of the user.
 * @returns Subscription data for the user.
 */
const getSubscriptionData = async (userId: string): Promise<Record<string, any>> => {
  try {
    const user = await User.findById(userId).lean();
    if (!user) throw new Error("User not found");

    return {
      subscriptionStatus: user.subscription_status,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
      subscriptionTier: user.subscriptionTier,
    };
  } catch (error) {
    return handleError(error, `Error fetching subscription data for user ${userId}`, {});
  }
};

/**
 * @desc    Tracks premium feature usage (goals, challenges, streaks, etc.) for a user.
 * @param   userId - The ID of the user.
 * @returns Feature usage data (e.g., number of challenges completed, streaks, etc.).
 */
const trackPremiumFeatureUsage = async (userId: string): Promise<Record<string, any>> => {
  try {
    const goalCompletionRate = await calculateGoalCompletionRate(userId);
    const challengeParticipationRate = await calculateChallengeParticipationRate(userId);

    return {
      goalCompletionRate,
      challengeParticipationRate,
    };
  } catch (error) {
    return handleError(error, `Error tracking premium feature usage for user ${userId}`, {});
  }
};

/**
 * @desc    Fetches comprehensive user analytics including various metrics.
 * @param   userId - The ID of the user.
 * @returns An object containing all analytics metrics.
 */
const getUserAnalytics = async (userId: string): Promise<Record<string, any> | null> => {
  try {
    const [subscriptionData, featureUsage] = await Promise.all([
      getSubscriptionData(userId),
      trackPremiumFeatureUsage(userId),
    ]);

    return {
      ...subscriptionData,
      ...featureUsage,
    };
  } catch (error) {
    return handleError(error, `Error fetching analytics for user ${userId}`, null);
  }
};

/**
 * @desc    Fetches global analytics metrics for all users.
 * @returns An object containing aggregated global analytics metrics.
 */
const getGlobalAnalytics = async (): Promise<Record<string, any> | null> => {
  try {
    const [totalUsers, totalGoals, totalChallenges, activeSubscribers] = await Promise.all([
      User.countDocuments(),
      Goal.countDocuments(),
      Challenge.countDocuments(),
      User.countDocuments({ subscription_status: "active" }),
    ]);

    return {
      totalUsers,
      totalGoals,
      totalChallenges,
      activeSubscribers,
    };
  } catch (error) {
    return handleError(error, "Error fetching global analytics", null);
  }
};

export default {
  calculateGoalCompletionRate,
  calculateChallengeParticipationRate,
  getUserAnalytics,
  getGlobalAnalytics,
  trackPremiumFeatureUsage,
};
