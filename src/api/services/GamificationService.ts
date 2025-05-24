// src/api/services/GamificationService.ts

import mongoose from "mongoose";
import GamificationModel, { type IGamification } from "../models/Gamification";

// What we want in our final payload
export interface LeaderboardEntry {
  _id: string;
  userId: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  level: number;
  points: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
  };
}

export interface UserProgress {
  level: number;
  points: number;
}

/**
 * Business‐logic for gamification: leaderboard, per‐user progress, points, etc.
 */
const GamificationService = {
  /**
   * Fetch a paginated leaderboard with populated user info.
   */
  async getLeaderboard(
    page = 1,
    limit = 10
  ): Promise<LeaderboardResult> {
    const skip = (page - 1) * limit;

    const [rawDocs, totalUsers] = await Promise.all([
      GamificationModel.find()
        .sort({ level: -1, points: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username profilePicture")
        .lean(),
      GamificationModel.countDocuments(),
    ]);

    const entries: LeaderboardEntry[] = rawDocs.map((doc) => {
      const d = doc as unknown as IGamification & {
        userId: { _id: any; username: string; profilePicture?: string };
      };

      return {
        _id: d._id.toString(),
        level: d.level,
        points: d.points,
        userId: {
          _id: d.userId._id.toString(),
          username: d.userId.username,
          profilePicture: d.userId.profilePicture,
        },
      };
    });

    return {
      entries,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
      },
    };
  },

  /**
   * Get or initialize a user's own gamification progress.
   */
  async getUserProgress(userId: string): Promise<UserProgress> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    // 1) Fetch the document (no .lean())
    let profile = await GamificationModel.findOne({ userId });

    // 2) If missing, create it
    if (!profile) {
      profile = await GamificationModel.create({ userId, level: 1, points: 0 });
    }

    // 3) Now `profile` is always a Document<IGamification>
    return {
      level: profile.level,
      points: profile.points,
    };
  },

  /**
   * Add points to a user's gamification profile (create if missing).
   */
  async addPoints(userId: string, amount: number): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    let profile = await GamificationModel.findOne({ userId });
    if (!profile) {
      profile = await GamificationModel.create({ userId, level: 1, points: 0 });
    }

    await profile.addPoints(amount);
  },
};

export default GamificationService;
