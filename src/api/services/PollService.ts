// src/api/services/PollService.ts
import Poll, { IPoll } from "../models/Poll";
import Group from "../models/Group";
import { Types } from "mongoose";
import { logger } from "../../utils/winstonLogger";
import NotificationService from "./NotificationService";
import { createError } from "../middleware/errorHandler";

export interface PollResult {
  question: string;
  results: { option: string; votes: number }[];
}

export interface PollExpirationResult {
  message: string;
  expired: boolean;
  results?: { option: string; votes: number }[];
}

class PollService {
  /**
   * Create a new poll in a group.
   */
  static async createPoll(
    groupId: string,
    question: string,
    options: string[],
    expirationDate: Date
  ): Promise<IPoll> {
    if (!Types.ObjectId.isValid(groupId)) {
      throw createError("Invalid group ID", 400);
    }
    if (!question.trim() || options.length < 2 || isNaN(expirationDate.getTime())) {
      throw createError("Invalid poll data", 400);
    }

    const poll = new Poll({
      groupId: new Types.ObjectId(groupId),
      question: question.trim(),
      options: options.map((opt) => ({ option: opt, votes: [] })),
      expirationDate,
      status: "active",
      createdAt: new Date(),
    });
    await poll.save();

    logger.info(`New poll created for group ${groupId}: "${question}"`);
    return poll;
  }

  /**
   * Record a vote on a poll and notify the group’s creator.
   */
  static async submitVote(
    pollId: string,
    optionId: string,
    voterId: string
  ): Promise<void> {
    if (!Types.ObjectId.isValid(pollId) || !Types.ObjectId.isValid(voterId)) {
      throw createError("Invalid poll or user ID", 400);
    }
    const poll = await Poll.findById(pollId);
    if (!poll) throw createError("Poll not found", 404);
    if (poll.get("isExpired")) throw createError("Poll has expired", 400);

    if (
      poll.options.some((opt) =>
        opt.votes.includes(new Types.ObjectId(voterId))
      )
    ) {
      throw createError("You have already voted in this poll", 400);
    }

    const opt = poll.options.find((o) => o._id.toString() === optionId);
    if (!opt) throw createError("Invalid option", 400);

    opt.votes.push(new Types.ObjectId(voterId));
    await poll.save();
    logger.info(`User ${voterId} voted on poll ${pollId}`);

    // Notify the poll creator
    const group = await Group.findById(poll.groupId);
    const ownerId = group?.createdBy.toString();
    if (ownerId && ownerId !== voterId) {
      await NotificationService.sendInAppNotification(
        voterId,
        ownerId,
        `Your poll "${poll.question}" just got a new vote!`,
        "info",
        `/polls/${pollId}`
      );
    }
  }

  /**
   * Get the results of a poll.
   */
  static async getPollResults(pollId: string): Promise<PollResult> {
    if (!Types.ObjectId.isValid(pollId)) {
      throw createError("Invalid poll ID", 400);
    }
    const poll = await Poll.findById(pollId);
    if (!poll) throw createError("Poll not found", 404);

    const results = poll.options.map((o) => ({
      option: o.option,
      votes: o.votes.length,
    }));
    return { question: poll.question, results };
  }

  /**
   * Check whether a poll is expired, and if so return its results.
   */
  static async checkPollExpiration(
    pollId: string
  ): Promise<PollExpirationResult> {
    if (!Types.ObjectId.isValid(pollId)) {
      throw createError("Invalid poll ID", 400);
    }
    const poll = await Poll.findById(pollId);
    if (!poll) throw createError("Poll not found", 404);

    if (poll.get("isExpired")) {
      const { results } = await this.getPollResults(pollId);
      return {
        message: "The poll has expired.",
        expired: true,
        results,
      };
    }
    return { message: "Poll is still active.", expired: false };
  }
}

export default PollService;
