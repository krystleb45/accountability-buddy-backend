// src/api/services/LeaderboardService.ts - FIXED: Conditional Redis usage
import Leaderboard from "../models/Leaderboard";
import Goal from "../models/Goal";
import { SortOrder } from "mongoose";
import { logger } from "../../utils/winstonLogger";

// Check if Redis is disabled
const isRedisDisabled = process.env.DISABLE_REDIS === "true" ||
                       process.env.SKIP_REDIS_INIT === "true" ||
                       process.env.REDIS_DISABLED === "true";

// In-memory cache as fallback when Redis is disabled
const memoryCache = new Map<string, { data: any; expiry: number }>();

// Redis client (only created if enabled)
let redis: any = null;

if (!isRedisDisabled) {
  try {
    // Dynamic import only when Redis is enabled
    const Redis = require("ioredis");
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

    redis.on("error", (err: Error) => {
      logger.error(`Leaderboard Redis error: ${err.message}`);
      redis = null; // Disable Redis on error
    });

    logger.info("✅ Leaderboard service using Redis cache");
  } catch (error) {
    logger.error(`Failed to initialize Redis for leaderboard: ${(error as Error).message}`);
    redis = null;
  }
} else {
  logger.info("🚫 Leaderboard service using memory cache (Redis disabled)");
}

// Cache helper functions
const cacheGet = async (key: string): Promise<string | null> => {
  if (redis) {
    try {
      return await redis.get(key);
    } catch (error) {
      logger.warn(`Redis get failed: ${(error as Error).message}`);
      redis = null; // Disable on error
    }
  }

  // Fallback to memory cache
  const cached = memoryCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  return null;
};

const cacheSet = async (key: string, value: string, ttlSeconds: number): Promise<void> => {
  if (redis) {
    try {
      await redis.setex(key, ttlSeconds, value);
      return;
    } catch (error) {
      logger.warn(`Redis set failed: ${(error as Error).message}`);
      redis = null; // Disable on error
    }
  }

  // Fallback to memory cache
  memoryCache.set(key, {
    data: value,
    expiry: Date.now() + (ttlSeconds * 1000)
  });

  // Clean up expired entries periodically
  if (memoryCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of memoryCache.entries()) {
      if (v.expiry <= now) {
        memoryCache.delete(k);
      }
    }
  }
};

const cacheDel = async (keys: string[]): Promise<void> => {
  if (redis && keys.length > 0) {
    try {
      await redis.del(...keys);
      return;
    } catch (error) {
      logger.warn(`Redis del failed: ${(error as Error).message}`);
      redis = null; // Disable on error
    }
  }

  // Fallback to memory cache
  keys.forEach(key => memoryCache.delete(key));
};

const cacheKeys = async (pattern: string): Promise<string[]> => {
  if (redis) {
    try {
      return await redis.keys(pattern);
    } catch (error) {
      logger.warn(`Redis keys failed: ${(error as Error).message}`);
      redis = null; // Disable on error
    }
  }

  // Fallback to memory cache - simple pattern matching
  const keys = Array.from(memoryCache.keys());
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return keys.filter(key => key.startsWith(prefix));
  }
  return keys.filter(key => key === pattern);
};

// Default sort: highest goals → milestones → points
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

    try {
      // Try cache first
      const cached = await cacheGet(cacheKey);
      if (cached) {
        logger.info(`Leaderboard cache hit ${cacheKey}`);
        const data = JSON.parse(cached);
        return {
          data,
          pagination: { totalEntries: 0, currentPage: page, totalPages: 0 },
        };
      }

      // Query database
      const [entries, totalEntries] = await Promise.all([
        Leaderboard.find()
          .sort(SORT_CRITERIA)
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("user", "username profilePicture"),
        Leaderboard.countDocuments(),
      ]);

      const totalPages = Math.ceil(totalEntries / limit);

      // Cache the results
      await cacheSet(cacheKey, JSON.stringify(entries), ttl);

      logger.info(`Leaderboard cache set ${cacheKey}`);
      return {
        data: entries,
        pagination: { totalEntries, currentPage: page, totalPages },
      };
    } catch (error) {
      logger.error(`Leaderboard fetchPage error: ${(error as Error).message}`);
      throw error;
    }
  }

  static async getUserPosition(userId: string): Promise<{ position: number; entry: any }> {
    try {
      const entries: any[] = await Leaderboard.find()
        .sort(SORT_CRITERIA)
        .populate("user", "username profilePicture");

      const idx = entries.findIndex((e) => e.user._id.toString() === userId);
      if (idx === -1) throw new Error("User not on leaderboard");

      return { position: idx + 1, entry: entries[idx] };
    } catch (error) {
      logger.error(`getUserPosition error: ${(error as Error).message}`);
      throw error;
    }
  }

  static async resetAll(): Promise<void> {
    try {
      await Leaderboard.deleteMany();

      // Clear cache
      const keys = await cacheKeys("leaderboard:*");
      if (keys.length > 0) {
        await cacheDel(keys);
      }

      logger.info("Leaderboard reset and cache cleared");
    } catch (error) {
      logger.error(`resetAll error: ${(error as Error).message}`);
      throw error;
    }
  }

  static async updateForUser(userId: string): Promise<void> {
    try {
      // Recalculate aggregates
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

      // Clear cache
      const keys = await cacheKeys("leaderboard:*");
      if (keys.length > 0) {
        await cacheDel(keys);
      }

      logger.info(`Leaderboard entry updated for ${userId}`);
    } catch (error) {
      logger.error(`updateForUser error: ${(error as Error).message}`);
      throw error;
    }
  }
}
