// src/api/controllers/PollController.ts
import type { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { logger } from "../../utils/winstonLogger";
import PollService from "../services/PollService";  // ← default import
import Poll from "../models/Poll"; // only used for listByGroup

/**
 * @desc    Create a new poll in a group
 * @route   POST /api/polls/:groupId
 * @access  Private
 */
export const createPoll = catchAsync(
  async (
    req: Request<
      { groupId: string },
      {},
      { question: string; options: string[]; expirationDate: string }
    >,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { groupId } = req.params;
    const { question, options, expirationDate } = req.body;

    if (!question.trim() || !Array.isArray(options) || options.length < 2) {
      return next(new Error("Question and at least two options are required"));
    }
    const expires = new Date(expirationDate);
    if (isNaN(expires.getTime())) {
      return next(new Error("Invalid expiration date"));
    }

    const newPoll = await PollService.createPoll(
      groupId,
      question.trim(),
      options,
      expires
    );

    sendResponse(res, 201, true, "Poll created successfully", { poll: newPoll });
    logger.info(`Poll created for group ${groupId}: ${question}`);
  }
);

/**
 * @desc    List all active polls in a group
 * @route   GET /api/polls/:groupId
 * @access  Private
 */
export const getPollsByGroup = catchAsync(
  async (req: Request<{ groupId: string }>, res: Response): Promise<void> => {
    const { groupId } = req.params;
    if (!Types.ObjectId.isValid(groupId)) {
      sendResponse(res, 400, false, "Invalid group ID");
      return;
    }
    const polls = await Poll.find({ groupId, status: "active" }).sort({
      createdAt: -1,
    });
    sendResponse(res, 200, true, "Polls fetched successfully", { polls });
    logger.info(`Fetched active polls for group ${groupId}`);
  }
);

/**
 * @desc    Submit a vote on a poll
 * @route   POST /api/polls/vote
 * @access  Private
 */
export const voteOnPoll = catchAsync(
  async (
    req: Request<{}, {}, { pollId: string; optionId: string }>,
    res: Response
  ): Promise<void> => {
    const { pollId, optionId } = req.body;
    const userId = req.user!.id;

    await PollService.submitVote(pollId, optionId, userId);

    sendResponse(res, 200, true, "Vote submitted successfully");
    logger.info(`User ${userId} voted on poll ${pollId}`);
  }
);

/**
 * @desc    Get poll results
 * @route   GET /api/polls/:pollId/results
 * @access  Public
 */
export const getPollResults = catchAsync(
  async (req: Request<{ pollId: string }>, res: Response): Promise<void> => {
    const { pollId } = req.params;
    const { question, results } = await PollService.getPollResults(pollId);
    sendResponse(res, 200, true, "Poll results fetched successfully", {
      question,
      results,
    });
    logger.info(`Poll results fetched for poll ${pollId}`);
  }
);

/**
 * @desc    Check poll expiration (and return results if expired)
 * @route   GET /api/polls/:pollId/expiry
 * @access  Public
 */
export const checkPollExpiration = catchAsync(
  async (req: Request<{ pollId: string }>, res: Response): Promise<void> => {
    const { pollId } = req.params;
    const outcome = await PollService.checkPollExpiration(pollId);
    sendResponse(
      res,
      200,
      true,
      outcome.expired ? "Poll has expired" : "Poll is still active",
      outcome.expired ? { results: outcome.results } : undefined
    );
    logger.info(`Poll expiration checked for poll ${pollId}: expired=${outcome.expired}`);
  }
);

export default {
  createPoll,
  getPollsByGroup,
  voteOnPoll,
  getPollResults,
  checkPollExpiration,
};
