import Poll, { IPoll } from "../models/Poll";
import { Types } from "mongoose";
import { logger } from "../../utils/winstonLogger";
import NotificationService from "./NotificationService"; // Assuming a NotificationService exists for sending notifications

// Function to handle vote submissions
const submitVote = async (
  pollId: string,
  optionId: string,
  userId: string
): Promise<void> => {
  try {
    // Convert userId and pollId to ObjectId for proper comparison
    const poll = await Poll.findById(pollId);

    if (!poll) {
      throw new Error("Poll not found");
    }

    if (poll.get("isExpired")) {
      throw new Error("Poll has expired");
    }

    // Check if the user has already voted
    const hasVoted = poll.options.some((option) =>
      option.votes.includes(new Types.ObjectId(userId))
    );
    if (hasVoted) {
      throw new Error("You have already voted in this poll");
    }

    // Find the option the user is voting for
    const option = poll.options.find((opt) => opt._id.toString() === optionId);
    if (!option) {
      throw new Error("Invalid poll option");
    }

    // Add the user to the votes array for the selected option
    option.votes.push(new Types.ObjectId(userId));

    // Save the poll with the updated votes
    await poll.save();
    logger.info(`User ${userId} voted for option ${optionId} in poll ${pollId}`);

    // Send notification to other group members or related users
    await NotificationService.sendInAppNotification(
      poll.groupId.toString(),
      `New vote added in poll: ${poll.question}`
    );
  } catch (error) {
    // Handle error by properly checking the type and logging it
    if (error instanceof Error) {
      logger.error(`Error submitting vote for poll ${pollId}: ${error.message}`);
      throw new Error(error.message);
    }
    logger.error(`Error submitting vote for poll ${pollId}: Unknown error`);
    throw new Error("Unknown error occurred");
  }
};

// Function to get poll results
const getPollResults = async (pollId: string): Promise<{ question: string; results: { option: string; votes: number }[] }> => {
  try {
    const poll = await Poll.findById(pollId);
    if (!poll) {
      throw new Error("Poll not found");
    }

    const results = poll.options.map((option) => ({
      option: option.option,
      votes: option.votes.length,
    }));

    return {
      question: poll.question,
      results,
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error fetching poll results for poll ${pollId}: ${error.message}`);
      throw new Error("Failed to fetch poll results");
    }
    logger.error(`Error fetching poll results for poll ${pollId}: Unknown error`);
    throw new Error("Unknown error occurred while fetching results");
  }
};

// Function to handle poll expiration check
interface PollExpirationResult {
    message: string;
    expired: boolean;
    results?: { option: string; votes: number }[]; // This is optional because it will be added only if the poll is expired
  }
  
const checkPollExpiration = async (pollId: string): Promise<PollExpirationResult> => {
  try {
    const poll = await Poll.findById(pollId);
    if (!poll) {
      throw new Error("Poll not found");
    }
    
    if (poll.get("isExpired")) {      return {
      message: "The poll has expired.",
      expired: true,
      results: (await getPollResults(pollId)).results,
    };
    }
    
    return {
      message: "Poll is still active.",
      expired: false,
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error checking poll expiration for poll ${pollId}: ${error.message}`);
      throw new Error("Failed to check poll expiration");
    }
    logger.error(`Error checking poll expiration for poll ${pollId}: Unknown error`);
    throw new Error("Unknown error occurred while checking poll expiration");
  }
};
  

// Function to create a new poll
const createPoll = async (
  groupId: string,
  question: string,
  options: string[],
  expirationDate: Date
): Promise<IPoll> => {
  try {
    const poll = new Poll({
      groupId: new Types.ObjectId(groupId),
      question,
      options: options.map((option) => ({ option, votes: [] })),
      expirationDate,
      status: "active",
    });

    await poll.save();
    logger.info(`New poll created in group ${groupId}: ${question}`);

    return poll;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error creating poll for group ${groupId}: ${error.message}`);
      throw new Error("Failed to create poll");
    }
    logger.error(`Error creating poll for group ${groupId}: Unknown error`);
    throw new Error("Unknown error occurred while creating poll");
  }
};

export default {
  submitVote,
  getPollResults,
  checkPollExpiration,
  createPoll,
};
