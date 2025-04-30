// src/api/services/GamificationService.ts

import mongoose from "mongoose";
import Gamification from "../models/Gamification";

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
      Gamification.find()
        .sort({ level: -1, points: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username profilePicture")
        .lean(), // <— lean gives us plain JS objects
      Gamification.countDocuments(),
    ]);

    // Now explicitly reshape
    const entries: LeaderboardEntry[] = rawDocs.map((doc) => {
      // Cast to unknown so TS stops complaining
      const d = doc as unknown as {
        _id: any;
        level: number;
        points: number;
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
   * Add points to a user's gamification profile (create if missing).
   */
  async addPoints(userId: string, amount: number): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    let profile = await Gamification.findOne({ userId });
    if (!profile) {
      profile = await Gamification.create({ userId, level: 1, points: 0 });
    }

    await profile.addPoints(amount);
  },
};

export default GamificationService;
