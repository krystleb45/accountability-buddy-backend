import Book from "../models/Book";
import { User } from "../models/User";
import { logger } from "../../utils/winstonLogger";

// Simulated Recommendation Algorithm (can be replaced with an AI model or a more sophisticated algorithm)
const recommendationEngine = (userInterests: string[], books: any[]): string[] => {
  const recommendedBooks: string[] = [];

  // Simulate matching books based on common interests (this can be further enhanced).
  books.forEach((book) => {
    if (userInterests.some(interest => book.category.toLowerCase().includes(interest.toLowerCase()))) {
      recommendedBooks.push(book.title);
    }
  });

  // Log the recommendation process
  logger.info(`Recommendation Engine: Based on interests, recommended books: ${recommendedBooks}`);

  return recommendedBooks.length > 0 ? recommendedBooks : ["No suitable books found. Try exploring more categories!"];
};

// Fetching AI-based book recommendations based on the user's preferences
export const getRecommendedBooks = async (userId: string): Promise<string[]> => {
  try {
    // Fetching the user's profile and interests.
    const user = await User.findById(userId).select("interests");

    if (!user) {
      logger.error(`User not found: ${userId}`);
      return [];
    }

    // Fetching all available books to compare with user interests.
    const books = await Book.find().select("title category");

    // Use the recommendation engine to match books based on interests
    const recommendations = recommendationEngine(user?.interests ?? [], books);

    logger.info(`AI-based book recommendations fetched for user ${userId}`);
    return recommendations;
  } catch (error) {
    logger.error(`Error fetching AI-based book recommendations for user ${userId}: ${(error as Error).message}`);
    return ["Sorry, we couldn't find recommendations at the moment. Please try again later."];
  }
};

