import { logger } from "../../utils/winstonLogger";
import { User } from "../models/User";

/**
 * Friend recommendation engine using mutual interests.
 * @param currentUserId - The ID of the user requesting recommendations.
 * @param userInterests - Array of the current user's interests.
 * @param users - All users with interests and usernames.
 * @returns Recommended friend usernames.
 */
const friendRecommendationEngine = (
  currentUserId: string,
  userInterests: string[],
  users: any[]
): string[] => {
  const recommendedFriends: string[] = [];

  users.forEach((user) => {
    if (user._id.toString() !== currentUserId) {
      const mutualInterests = userInterests.filter((interest) =>
        user.interests.includes(interest)
      );

      if (mutualInterests.length > 0) {
        recommendedFriends.push(user.username);
      }
    }
  });

  logger.info(
    `AI Recommendation Engine: Based on mutual interests, recommended friends: ${recommendedFriends}`
  );

  return recommendedFriends.length > 0
    ? recommendedFriends
    : ["No suitable friends found, try broadening your interests!"];
};

/**
 * Fetches AI-generated friend recommendations for a given user.
 * @param userId - ID of the user to fetch recommendations for.
 */
export const getAIRecommendedFriends = async (
  userId: string
): Promise<string[]> => {
  try {
    const user = await User.findById(userId).select("interests username");

    if (!user) {
      logger.error(`User not found: ${userId}`);
      return [];
    }

    const users = await User.find().select("interests username");

    const recommendations = friendRecommendationEngine(
      user._id.toString(),
      user.interests ?? [],
      users
    );

    logger.info(`AI-based friend recommendations fetched for user ${userId}`);
    return recommendations;
  } catch (error) {
    logger.error(
      `Error fetching AI-based friend recommendations for user ${userId}: ${
        (error as Error).message
      }`
    );
    return [
      "Sorry, we couldn't find recommendations at the moment. Please try again later.",
    ];
  }
};

/**
 * AI-based chat group recommendation engine for a user.
 * @param userId - ID of the user to recommend chat groups to.
 */
export const getRecommendedGroupsBasedOnAI = async (
  userId: string
): Promise<string[]> => {
  try {
    const user = await User.findById(userId).select("interests username");

    if (!user) {
      logger.error(`User not found: ${userId}`);
      return [];
    }

    // Simulated list of available chat groups
    const availableChatGroups = [
      "Tech Enthusiasts",
      "Fitness and Health",
      "Travel Explorers",
      "Book Lovers",
      "Meditation and Mindfulness",
      "Gaming Community",
    ];

    // Recommend groups that include at least one user interest
    const recommendations = availableChatGroups.filter((group) =>
      (user.interests ?? []).some((interest) =>
        group.toLowerCase().includes(interest.toLowerCase())
      )
    );

    logger.info(
      `AI-based chat group recommendations fetched for user ${userId}`
    );

    return recommendations.length > 0
      ? recommendations
      : ["No matching groups found. Try exploring different interests!"];
  } catch (error) {
    logger.error(
      `Error fetching AI-based chat group recommendations for user ${userId}: ${
        (error as Error).message
      }`
    );
    return [
      "Sorry, we couldn't find recommendations at the moment. Please try again later.",
    ];
  }
};
