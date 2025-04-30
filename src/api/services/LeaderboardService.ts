// src/api/services/LeaderboardService.ts
import Leaderboard from "../models/Leaderboard";
import Goal from "../models/Goal";
import Redis from "ioredis";
import { SortOrder } from "mongoose";
import { logger } from "../../utils/winstonLogger";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// default sort: highest goals → milestones → points
const SORT_CRITERIA: Record<string, SortOrder> = {
  completedGoals: -1,
  completedMilestones: -1,
  totalPoints: -1,
};

export interface PageResult<T> {
  data: T[];
  pagination: { totalEntries: number; currentPage: number; totalPages: number };
}

export default class LeaderboardService {
  static async fetchPage(limit: number, page: number): Promise<PageResult<any>> {
    const cacheKey = `leaderboard:${page}:${limit}`;
    const ttl = 60 * 60; // 1h

    // try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info(`Leaderboard cache hit ${cacheKey}`);
      const data = JSON.parse(cached);
      return {
        data,
        pagination: { totalEntries: 0, currentPage: page, totalPages: 0 },
      };
    }

    // query DB
    const [entries, totalEntries] = await Promise.all([
      Leaderboard.find()
        .sort(SORT_CRITERIA)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("user", "username profilePicture"),
      Leaderboard.countDocuments(),
    ]);
    const totalPages = Math.ceil(totalEntries / limit);

    // cache
    void redis.setex(cacheKey, ttl, JSON.stringify(entries));

    logger.info(`Leaderboard cache set ${cacheKey}`);
    return {
      data: entries,
      pagination: { totalEntries, currentPage: page, totalPages },
    };
  }

  static async getUserPosition(userId: string): Promise<{ position: number; entry: any }> {
    const entries: any[] = await Leaderboard.find()
      .sort(SORT_CRITERIA)
      .populate("user", "username profilePicture");

    const idx = entries.findIndex((e) => e.user._id.toString() === userId);
    if (idx === -1) throw new Error("User not on leaderboard");

    return { position: idx + 1, entry: entries[idx] };
  }

  static async resetAll(): Promise<void> {
    await Leaderboard.deleteMany();
    const keys = await redis.keys("leaderboard:*");
    if (keys.length) await redis.del(...keys);
    logger.info("Leaderboard reset and cache cleared");
  }

  static async updateForUser(userId: string): Promise<void> {
    // recalc aggregates
    const goals = await Goal.find({ user: userId, status: "completed" });
    const completedGoals = goals.length;
    const completedMilestones = goals.reduce(
      (sum, g) => sum + (g.milestones?.filter((m) => m.completed).length || 0),
      0
    );
    const totalPoints = goals.reduce((sum, g) => sum + (g.points || 0), 0);

    await Leaderboard.findOneAndUpdate(
      { user: userId },
      { completedGoals, completedMilestones, totalPoints },
      { upsert: true, new: true }
    );

    // clear cache
    const keys = await redis.keys("leaderboard:*");
    if (keys.length) await redis.del(...keys);
    logger.info(`Leaderboard entry updated for ${userId}`);
  }
}
