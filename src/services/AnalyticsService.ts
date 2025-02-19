import Goal from "../models/Goal";
import Challenge from "../models/Challenge";
import ActivityLog from "../models/Activity";
import logger from "../utils/winstonLogger";

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
 * @desc    Calculates the average goal progress for a user.
 * @param   userId - The ID of the user.
 * @returns The average progress (0 to 100).
 */
const calculateAverageGoalProgress = async (userId: string): Promise<number> => {
  try {
    const goals = await Goal.find({ userId }).lean();
    if (!goals.length) return 0;

    const totalProgress = goals.reduce((sum, goal) => sum + (goal.progress || 0), 0);
    return totalProgress / goals.length;
  } catch (error) {
    return handleError(error, `Error calculating average goal progress for user ${userId}`, 0);
  }
};

/**
 * @desc    Calculates user engagement level based on login frequency and actions taken.
 * @param   userId - The ID of the user.
 * @returns User activity level ("low", "medium", "high").
 */
const calculateUserActivityLevel = async (userId: string): Promise<string> => {
  try {
    const totalActions = await ActivityLog.countDocuments({ userId }); // Optimize by counting directly
    if (totalActions >= 50) return "high";
    if (totalActions >= 20) return "medium";
    return "low";
  } catch (error) {
    return handleError(error, `Error calculating user activity level for user ${userId}`, "low");
  }
};

/**
 * @desc    Calculates the milestone completion rate for all goals of a user.
 * @param   userId - The ID of the user.
 * @returns The milestone completion rate (0 to 100).
 */
const calculateMilestoneCompletionRate = async (userId: string): Promise<number> => {
  try {
    const goals = await Goal.find({ userId }).lean();
    if (!goals.length) return 0;

    let totalMilestones = 0;
    let completedMilestones = 0;

    goals.forEach((goal) => {
      totalMilestones += goal.milestones.length;
      completedMilestones += goal.milestones.filter((milestone) => milestone.completed).length;
    });

    return totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  } catch (error) {
    return handleError(error, `Error calculating milestone completion rate for user ${userId}`, 0);
  }
};

/**
 * @desc    Fetches comprehensive user analytics including various metrics.
 * @param   userId - The ID of the user.
 * @returns An object containing all analytics metrics.
 */
const getUserAnalytics = async (userId: string): Promise<Record<string, any> | null> => {
  try {
    const [goalCompletionRate, challengeParticipationRate, averageGoalProgress, userActivityLevel, milestoneCompletionRate] =
      await Promise.all([
        calculateGoalCompletionRate(userId),
        calculateChallengeParticipationRate(userId),
        calculateAverageGoalProgress(userId),
        calculateUserActivityLevel(userId),
        calculateMilestoneCompletionRate(userId),
      ]);

    return {
      goalCompletionRate,
      challengeParticipationRate,
      averageGoalProgress,
      userActivityLevel,
      milestoneCompletionRate,
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
    const [totalUsers, totalGoals, totalChallenges] = await Promise.all([
      Goal.countDocuments(), // Assuming "Goal" here implies the User model
      Goal.countDocuments(),
      Challenge.countDocuments(),
    ]);

    return {
      totalUsers,
      totalGoals,
      totalChallenges,
    };
  } catch (error) {
    return handleError(error, "Error fetching global analytics", null);
  }
};

export default {
  calculateGoalCompletionRate,
  calculateChallengeParticipationRate,
  calculateAverageGoalProgress,
  calculateUserActivityLevel,
  calculateMilestoneCompletionRate,
  getUserAnalytics,
  getGlobalAnalytics,
};
