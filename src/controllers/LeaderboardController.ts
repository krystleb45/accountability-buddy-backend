import type { Request, Response } from "express";

import { Leaderboard } from "../models/Leaderboard";
import Goal from "../models/Goal";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import logger from "../utils/winstonLogger";


/**
 * @desc Get the leaderboard
 * @route GET /api/leaderboard
 * @access Public
 */
export const getLeaderboard = catchAsync(
  async (
    req: Request<{}, any, { limit?: string; page?: string }>,
    res: Response,
  ): Promise<void> => {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const page = parseInt(req.query.page as string, 10) || 1;

    const leaderboard = await Leaderboard.find()
      .sort({ completedGoals: -1, completedMilestones: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username profilePicture");

    const totalEntries = await Leaderboard.countDocuments();
    const totalPages = Math.ceil(totalEntries / limit);

    sendResponse(res, 200, true, "Leaderboard fetched successfully", {
      leaderboard,
      pagination: {
        totalEntries,
        currentPage: page,
        totalPages,
      },
    });
  },
);

/**
 * @desc Update leaderboard after goal completion
 * @param userId - ID of the user whose leaderboard entry is to be updated
 * @returns Promise<void>
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

    await Leaderboard.findOneAndUpdate(
      { user: userId },
      { completedGoals, completedMilestones },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    logger.info(`Leaderboard updated for user: ${userId}`);
  } catch (error) {
    logger.error(
      `Error updating leaderboard for user ${userId}: ${(error as Error).message}`,
    );
  }
};

/**
 * @desc Get a user's leaderboard position
 * @route GET /api/leaderboard/user-position
 * @access Private
 */
export const getUserLeaderboardPosition = catchAsync(
  async (req: Request<{}, {}, {}, {}>, res: Response): Promise<void> => {
    const userId = req.user?.id;

    const leaderboard = await Leaderboard.find()
      .sort({ completedGoals: -1, completedMilestones: -1 })
      .populate("user", "username profilePicture");

    const userPosition =
      leaderboard.findIndex((entry) => entry.user.toString() === userId) + 1;
    const userEntry = leaderboard.find(
      (entry) => entry.user.toString() === userId,
    );

    if (!userEntry) {
      sendResponse(res, 404, false, "User not found on the leaderboard");
      return;
    }

    sendResponse(
      res,
      200,
      true,
      "User leaderboard position fetched successfully",
      {
        userPosition,
        userEntry,
      },
    );
  },
);

/**
 * @desc Reset the leaderboard (Admin only)
 * @route DELETE /api/leaderboard/reset
 * @access Private/Admin
 */
export const resetLeaderboard = catchAsync(
  async (req: Request<{}, {}, {}, {}>, res: Response): Promise<void> => {
    if (!req.user?.isAdmin) {
      sendResponse(res, 403, false, "Access denied");
      return;
    }

    await Leaderboard.deleteMany();

    sendResponse(res, 200, true, "Leaderboard reset successfully");
  },
);
