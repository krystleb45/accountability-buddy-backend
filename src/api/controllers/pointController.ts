import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import Poll from "../models/Poll";
import Group from "../models/Group"; // Importing the Group model to validate group existence
import { Types } from "mongoose";


// 🟢 Create a poll in a group
export const createPoll = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { groupId, question, options, expirationDate } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return next(new Error("User not authenticated"));
    }

    // Check if the group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return next(new Error("Group not found"));
    }

    const newPoll = await Poll.create({
      groupId,
      question,
      options: options.map((option: string) => ({ option, votes: 0 })),
      expirationDate,
      status: "active",
    });

    sendResponse(res, 201, true, "Poll created successfully", {
      poll: newPoll,
    });
  }
);

// 🟢 Fetch all polls for a group
export const getPollsForGroup = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { groupId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return next(new Error("User not authenticated"));
    }

    // Fetch polls for the specified group
    const polls = await Poll.find({ groupId }).sort({ createdAt: -1 });

    sendResponse(res, 200, true, "Polls fetched successfully", {
      polls,
    });
  }
);

// 🟢 Submit a vote on a poll
// 🟢 Submit a vote on a poll
export const voteOnPoll = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { pollId } = req.params;
    const { optionId } = req.body; // The option selected by the user
    const userId = req.user?.id;

    if (!userId) {
      return next(new Error("User not authenticated"));
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return next(new Error("Poll not found"));
    }

    // Check if the poll is expired
    if (poll.get("isExpired")) {
      return next(new Error("This poll has expired"));
    }



    // Check if the user has already voted
    const hasVoted = poll.options.some((option) =>
      option.votes.includes(new Types.ObjectId(userId)) // Convert userId to ObjectId for comparison
    );
    if (hasVoted) {
      return next(new Error("You have already voted in this poll"));
    }

    // Find the option the user is voting for
    const option = poll.options.find((option) => option._id.toString() === optionId);
    if (!option) {
      return next(new Error("Invalid poll option"));
    }

    // Add the user ID to the votes array for the selected option
    option.votes.push(new Types.ObjectId(userId)); // Convert userId to ObjectId before pushing it
    await poll.save();


    sendResponse(res, 200, true, "Vote submitted successfully", {
      poll,
    });
  }
);



// 🟢 Get poll results (including total votes)
export const getPollResults = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { pollId } = req.params;

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return next(new Error("Poll not found"));
    }

    // Return the poll results
    const results = poll.options.map((option) => ({
      option: option.option,
      votes: option.votes.length, // Count the votes for each option
    }));

    sendResponse(res, 200, true, "Poll results fetched successfully", {
      results,
    });
  }
);

// 🟢 Check poll expiration logic and mark poll as expired
export const checkPollExpiration = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { pollId } = req.params;

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return next(new Error("Poll not found"));
    }

    // If the poll has expired, update its status
    if (new Date() > new Date(poll.expirationDate)) {
      poll.status = "expired";
      await poll.save();
    }

    sendResponse(res, 200, true, "Poll expiration status checked", {
      poll,
    });
  }
);
