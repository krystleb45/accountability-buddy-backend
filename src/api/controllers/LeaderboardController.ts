import { Request, Response, NextFunction } from "express";
import Leaderboard from "../models/Leaderboard";
import Goal from "../models/Goal";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { logger } from "../../utils/winstonLogger";
import Redis from "ioredis";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";
import { SortOrder } from "mongoose";


// Create Redis client
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

/**
 * @desc Get the leaderboard with pagination and caching
 * @route GET /api/leaderboard
 * @access Public
 */
export const getLeaderboard = catchAsync(
  async (
    req: Request<{}, any, any, { limit?: string; page?: string }>,
    res: Response
  ): Promise<void> => {
    const limit = parseInt(req.query.limit || "10", 10);
    const page = parseInt(req.query.page || "1", 10);
    const cacheKey = `leaderboard:${page}:${limit}`;

    // Check Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      sendResponse(res, 200, true, "Leaderboard fetched from cache", {
        leaderboard: JSON.parse(cached),
        pagination: {
          totalEntries: 0, // optionally store in cache later
          currentPage: page,
          totalPages: 0,
        },
      });
      logger.info(`Leaderboard cache hit: ${cacheKey}`);
      return;
    }

    // Sort config — add more fields if available in schema
    const sortCriteria: { [key: string]: SortOrder } = {
      completedGoals: -1,
      completedMilestones: -1,
      totalPoints: -1,
    };


    const leaderboard = await Leaderboard.find()
      .sort(sortCriteria)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username profilePicture");

    const totalEntries = await Leaderboard.countDocuments();
    const totalPages = Math.ceil(totalEntries / limit);

    // Cache the result
    await redis.setex(cacheKey, 3600, JSON.stringify(leaderboard));

    sendResponse(res, 200, true, "Leaderboard fetched successfully", {
      leaderboard,
      pagination: {
        totalEntries,
        currentPage: page,
        totalPages,
      },
    });
    logger.info(`Leaderboard fetched from DB and cached: ${cacheKey}`);
  }
);

/**
 * @desc Get a user's leaderboard position
 * @route GET /api/leaderboard/user-position
 * @access Private
 */
export const getUserLeaderboardPosition = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized access");
      return;
    }

    const sortCriteria: { [key: string]: SortOrder } = {
      completedGoals: -1,
      completedMilestones: -1,
      totalPoints: -1,
    };

    const leaderboard = await Leaderboard.find()
      .sort(sortCriteria)
      .populate("user", "username profilePicture");

    const userEntry = leaderboard.find(
      (entry) => entry.user && entry.user.toString() === userId
    );

    if (!userEntry) {
      sendResponse(res, 404, false, "User not found on the leaderboard");
      return;
    }

    const userPosition =
      leaderboard.findIndex((entry) => entry.user?.toString() === userId) + 1;

    sendResponse(res, 200, true, "User leaderboard position fetched successfully", {
      userPosition,
      userEntry,
    });
    logger.info(`Leaderboard position fetched for user: ${userId}`);
  }
);

/**
 * @desc Reset the leaderboard (Admin only)
 * @route DELETE /api/leaderboard/reset
 * @access Private/Admin
 */
export const resetLeaderboard = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user?.isAdmin) {
      sendResponse(res, 403, false, "Access denied");
      return;
    }

    await Leaderboard.deleteMany();

    // Invalidate Redis leaderboard cache using pattern delete
    const keys = await redis.keys("leaderboard:*");
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info("All leaderboard cache keys cleared");
    }

    sendResponse(res, 200, true, "Leaderboard reset successfully");
    logger.info(`Leaderboard reset by admin: ${authReq.user?.id}`);
  }
);

/**
 * @desc Update leaderboard entry for a user after goal completion
 * @param userId - ID of the user whose leaderboard entry is to be updated
 */
export const updateLeaderboard = async (userId: string): Promise<void> => {
  try {
    const goals = await Goal.find({ user: userId, status: "completed" });

    const completedGoals = goals.length;
    const completedMilestones = goals.reduce((total, goal) => {
      return (
        total +
        (goal.milestones
          ? goal.milestones.filter((m) => m.completed).length
          : 0)
      );
    }, 0);

    const totalPoints = goals.reduce((sum, goal) => sum + (goal.points || 0), 0);

    await Leaderboard.findOneAndUpdate(
      { user: userId },
      {
        completedGoals,
        completedMilestones,
        totalPoints,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    logger.info(`Leaderboard updated for user: ${userId}`);

    // Clear all cached pages of leaderboard
    const keys = await redis.keys("leaderboard:*");
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Leaderboard cache cleared after update for user: ${userId}`);
    }
  } catch (error) {
    logger.error(
      `Error updating leaderboard for user ${userId}: ${(error as Error).message}`
    );
  }
};
