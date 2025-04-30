// src/api/services/MatchService.ts
import { Types } from "mongoose";
import { Match, IMatch } from "../models/Match";
import { CustomError } from "../middleware/errorHandler";

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class MatchService {
  /**
   * Create a new match between two users.
   */
  static async createMatch(
    user1: string,
    user2: string,
    status: string
  ): Promise<IMatch> {
    if (!Types.ObjectId.isValid(user1) || !Types.ObjectId.isValid(user2)) {
      throw new CustomError("Invalid user ID(s)", 400);
    }
    if (user1 === user2) {
      throw new CustomError("A user cannot be matched with themselves", 400);
    }

    // ensure neither order already exists
    const existing = await Match.findOne({
      $or: [
        { user1, user2 },
        { user1: user2, user2: user1 },
      ],
    });

    if (existing) {
      throw new CustomError("Match already exists between these users", 400);
    }

    const match = new Match({ user1, user2, status });
    return await match.save();
  }

  /**
   * Fetch paginated matches for a given user.
   */
  static async getUserMatches(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<PaginationResult<IMatch>> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new CustomError("Invalid user ID", 400);
    }
    const filter = { $or: [{ user1: userId }, { user2: userId }] };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Match.find(filter)
        .populate("user1 user2", "username profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Match.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Fetch a single match by its ID.
   */
  static async getMatchById(matchId: string): Promise<IMatch> {
    if (!Types.ObjectId.isValid(matchId)) {
      throw new CustomError("Invalid match ID", 400);
    }
    const match = await Match.findById(matchId).populate(
      "user1 user2",
      "username profilePicture"
    );
    if (!match) {
      throw new CustomError("Match not found", 404);
    }
    return match;
  }

  /**
   * Update only the status of a match.
   */
  static async updateMatchStatus(
    matchId: string,
    status: string
  ): Promise<IMatch> {
    const validStatuses = ["pending", "active", "rejected", "completed"];
    if (!validStatuses.includes(status)) {
      throw new CustomError("Invalid match status", 400);
    }
    if (!Types.ObjectId.isValid(matchId)) {
      throw new CustomError("Invalid match ID", 400);
    }
    const match = await Match.findByIdAndUpdate(
      matchId,
      { status },
      { new: true }
    );
    if (!match) {
      throw new CustomError("Match not found", 404);
    }
    return match;
  }

  /**
   * Delete a match by its ID.
   */
  static async deleteMatch(matchId: string): Promise<void> {
    if (!Types.ObjectId.isValid(matchId)) {
      throw new CustomError("Invalid match ID", 400);
    }
    const result = await Match.findByIdAndDelete(matchId);
    if (!result) {
      throw new CustomError("Match not found", 404);
    }
  }
}

export default MatchService;
