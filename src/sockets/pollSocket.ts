import { Server, Socket } from "socket.io";
import Poll from "../api/models/Poll";
import { logger } from "../utils/winstonLogger";
import { Types } from "mongoose";

// Function to handle WebSocket connections related to polls
export const pollSocketHandler = (io: Server, socket: Socket): void => {
  logger.info(`User connected: ${socket.id}`);

  // Listen for vote events on a poll
  socket.on("votePoll", async (pollId: string, optionId: string, userId: string) => {
    try {
      // Retrieve the poll by its ID
      const poll = await Poll.findById(pollId);
      if (!poll) {
        socket.emit("error", "Poll not found");
        return;
      }

      // Check if the poll is expired
      if (poll.get("isExpired")) {
        socket.emit("error", "Poll has expired");
        return;
      }

      // Check if the user has already voted
      const hasVoted = poll.options.some((option) => option.votes.includes(new Types.ObjectId(userId)));      if (hasVoted) {
        socket.emit("error", "You have already voted on this poll");
        return;
      }

      // Find the selected option
      const selectedOption = poll.options.find((option) => option._id.toString() === optionId);
      if (!selectedOption) {
        socket.emit("error", "Invalid option selected");
        return;
      }

      // Add user ID to the selected option's votes array
      selectedOption.votes.push(new Types.ObjectId(userId));
      await poll.save();

      // Broadcast the vote update to all users in the same group
      io.to(poll.groupId.toString()).emit("pollUpdated", poll);

      logger.info(`User ${userId} voted for option ${optionId} in poll ${pollId}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(`Error processing vote for poll ${pollId}: ${error.message}`);
        socket.emit("error", "An error occurred while voting");
      } else {
        logger.error(`Unexpected error: ${String(error)}`);
        socket.emit("error", "An unexpected error occurred");
      }
    }
  });

  // Listen for a request to fetch poll results
  socket.on("getPollResults", async (pollId: string) => {
    try {
      // Retrieve the poll and send the results to the client
      const poll = await Poll.findById(pollId);
      if (!poll) {
        socket.emit("error", "Poll not found");
        return;
      }

      // Send the poll results to the requesting user
      const results = poll.options.map((option) => ({
        option: option.option,
        votes: option.votes.length, // Count the number of votes for each option
      }));

      socket.emit("pollResults", results);
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(`Error fetching results for poll ${pollId}: ${error.message}`);
        socket.emit("error", "An error occurred while fetching poll results");
      } else {
        logger.error(`Unexpected error: ${String(error)}`);
        socket.emit("error", "An unexpected error occurred");
      }
    }
  });

  // Listen for a request to close the socket connection
  socket.on("disconnect", () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
};

export default pollSocketHandler;
