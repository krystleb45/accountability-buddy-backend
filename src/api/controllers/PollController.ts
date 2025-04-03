import { Request, Response, NextFunction } from "express";
import Poll from "../models/Poll";
import Group from "../models/Group";
import sendResponse from "../utils/sendResponse";
import catchAsync from "../utils/catchAsync";
import { logger } from "../../utils/winstonLogger";
import { Types } from "mongoose";

// 🟢 Create a new poll
export const createPoll = catchAsync(
  async (req: Request<{ groupId: string }, {}, { question: string; options: string[]; expirationDate: string }>, res: Response, next: NextFunction): Promise<void> => {
    const { groupId } = req.params;
    const { question, options, expirationDate } = req.body;

    // Validate group
    const group = await Group.findById(groupId);
    if (!group) {
      return next(new Error("Group not found"));
    }

    // Create poll options array
    const pollOptions = options.map(option => ({
      option,
      votes: 0, // Initially, no votes for any option
    }));

    // Create a new poll
    const newPoll = await Poll.create({
      groupId,
      question,
      options: pollOptions,
      expirationDate: new Date(expirationDate),
      status: "active", // Set poll status to active initially
    });

    sendResponse(res, 201, true, "Poll created successfully", { poll: newPoll });
    logger.info(`Poll created for group ${groupId}: ${question}`);
  }
);

// 🟢 Get polls by group
export const getPollsByGroup = catchAsync(
  async (req: Request<{ groupId: string }>, res: Response): Promise<void> => {
    const { groupId } = req.params;

    // Find polls in the group
    const polls = await Poll.find({ groupId, status: "active" });

    sendResponse(res, 200, true, "Polls fetched successfully", { polls });
    logger.info(`Fetched active polls for group ${groupId}`);
  }
);

// 🟢 Vote on a poll
export const voteOnPoll = catchAsync(
  async (req: Request<{}, {}, { pollId: string; optionId: string }>, res: Response, next: NextFunction): Promise<void> => {
    const { pollId, optionId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return next(new Error("User not authenticated"));
    }

    // Find the poll by ID
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return next(new Error("Poll not found"));
    }

    // Check if the poll has expired
    if (poll.get("isExpired")) {
      return next(new Error("Poll has expired"));
    }

    // Check if the user has already voted
    const hasVoted = poll.options.some((option) => option.votes.includes(new Types.ObjectId(userId)));
    if (hasVoted) {
      return next(new Error("You have already voted in this poll"));
    }

    // Find the option the user is voting for
    const selectedOption = poll.options.find((option) => option._id.toString() === optionId);
    if (!selectedOption) {
      return next(new Error("Invalid poll option"));
    }

    // Add the user ID to the selected option's votes array
    selectedOption.votes.push(new Types.ObjectId(userId));
    await poll.save();

    sendResponse(res, 200, true, "Vote submitted successfully");
    logger.info(`User ${userId} voted on poll ${pollId}`);
  }
);

// 🟢 Get poll results
export const getPollResults = catchAsync(
  async (req: Request<{ pollId: string }>, res: Response, next: NextFunction): Promise<void> => {
    const { pollId } = req.params;

    // Find the poll by ID
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return next(new Error("Poll not found"));
    }

    // Get the results (option counts)
    const results = poll.options.map((option) => ({
      option: option.option,
      votes: option.votes.length, // Count votes for each option
    }));

    sendResponse(res, 200, true, "Poll results fetched successfully", { results });
    logger.info(`Poll results fetched for poll ${pollId}`);
  }
);
