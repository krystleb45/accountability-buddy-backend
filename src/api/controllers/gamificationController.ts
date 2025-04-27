// src/api/controllers/gamificationController.ts
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Gamification from "../models/Gamification";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

/**
 * @desc    Get paginated leaderboard
 * @route   GET /api/gamification/leaderboard
 * @access  Private
 */
export const getLeaderboard = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // parse & default
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

    const skip = (page - 1) * limit;

    // fetch sorted by level desc, points desc
    const [entries, totalUsers] = await Promise.all([
      Gamification.find()
        .sort({ level: -1, points: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username profilePicture"),
      Gamification.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    sendResponse(res, 200, true, "Leaderboard retrieved successfully", {
      entries,
      pagination: { currentPage: page, totalPages, totalUsers },
    });
  }
);

/**
 * @desc    Add points to a user's gamification profile
 * @route   POST /api/gamification/add-points
 * @access  Private
 */
export const addPoints = catchAsync(
  async (req: Request<{}, {}, { userId: string; points: number }>, res: Response, _next: NextFunction): Promise<void> => {
    const { userId, points } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      sendResponse(res, 400, false, "Invalid user ID");
      return;
    }

    // find or create gamification doc
    let profile = await Gamification.findOne({ userId });
    if (!profile) {
      // if you want to auto-create:
      profile = await Gamification.create({ userId, level: 1, points: 0 });
    }

    // assume model defines an instance method `addPoints`
    if (typeof profile.addPoints === "function") {
      await profile.addPoints(points);
    } else {
      // simple increment if no helper
      profile.points += points;
      await profile.save();
    }

    sendResponse(res, 200, true, `Added ${points} points to user ${userId}`);
  }
);

export default {
  getLeaderboard,
  addPoints,
};
