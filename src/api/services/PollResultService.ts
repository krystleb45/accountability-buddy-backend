// src/api/services/PollResultService.ts
import Poll from "../models/Poll";
import { Types } from "mongoose";
import NotificationService from "./NotificationService";
import { createError } from "../middleware/errorHandler";

export interface PollResult {
  optionId: string;
  votesCount: number;
}

class PollResultService {
  /**
   * Record a vote and notify the group’s creator.
   * (Controller calls this as `.vote()`.)
   */
  static async vote(
    pollId: string,
    optionId: string,
    voterId: string
  ): Promise<void> {
    // 1) validate IDs
    if (
      !Types.ObjectId.isValid(pollId) ||
      !Types.ObjectId.isValid(optionId) ||
      !Types.ObjectId.isValid(voterId)
    ) {
      throw createError("Invalid poll, option, or user ID", 400);
    }

    // 2) load poll
    const poll = await Poll.findById(pollId);
    if (!poll) throw createError("Poll not found", 404);
    if (poll.get("isExpired")) throw createError("Poll has expired", 400);

    // 3) prevent double‐voting
    if (
      poll.options.some((opt) =>
        opt.votes.includes(new Types.ObjectId(voterId))
      )
    ) {
      throw createError("You’ve already voted", 400);
    }

    // 4) cast vote
    const opt = poll.options.find((o) => o._id.toString() === optionId);
    if (!opt) throw createError("Invalid option", 400);
    opt.votes.push(new Types.ObjectId(voterId));
    await poll.save();

    // 5) notify group owner
    const group = await import("../models/Group").then((m) =>
      m.default.findById(poll.groupId)
    );
    const ownerId = group?.createdBy.toString();
    if (ownerId && ownerId !== voterId) {
      await NotificationService.sendInAppNotification(
        voterId,
        ownerId,
        `Your poll "${poll.question}" just received a new vote!`,
        "info",
        `/polls/${pollId}`
      );
    }
  }

  /**
   * Fetch current vote counts for a poll.
   * (Controller calls this as `.getResults()`.)
   */
  static async getResults(pollId: string): Promise<PollResult[]> {
    if (!Types.ObjectId.isValid(pollId)) {
      throw createError("Invalid poll ID", 400);
    }
    const poll = await Poll.findById(pollId);
    if (!poll) throw createError("Poll not found", 404);

    return poll.options.map((o) => ({
      optionId: o._id.toString(),
      votesCount: o.votes.length,
    }));
  }
}

export default PollResultService;
