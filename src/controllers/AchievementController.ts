import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Achievement from "../models/Achievement";
import catchAsync from "../api/utils/catchAsync";
import sendResponse from "../api/utils/sendResponse";
import { createError } from "../middleware/errorHandler";
import { IUser } from "../api/models/User";

/**
 * @desc Get all achievements for a user
 * @route GET /api/achievements
 * @access Private
 */
export const getAllAchievements = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userIdString = req.user?.id;

    if (!mongoose.isValidObjectId(userIdString)) {
      return next(createError("Invalid User ID format.", 400));
    }

    const userId = new mongoose.Types.ObjectId(userIdString);

    const achievements = await Achievement.find({ user: userId });

    sendResponse(res, 200, true, "User achievements retrieved successfully", { achievements });
  }
);

/**
 * @desc Check if user qualifies for a new streak achievement
 * @param user - The user object
 */
export const checkStreakAchievements = async (user: IUser): Promise<void> => {
  // ✅ Ensure `streak` has a default value
  user.streak = user.streak ?? 0;

  const streakAchievements = await Achievement.find({ name: /streak/i });

  for (const achievement of streakAchievements) {
    user.achievements = user.achievements ?? [];

    const achievementId = achievement._id as mongoose.Types.ObjectId;

    if (!user.achievements.includes(achievementId) && user.streak >= achievement.requirements) {
      user.achievements.push(achievementId);
      await user.save();
    }
  }
};

/**
 * @desc Get a single achievement by ID
 * @route GET /api/achievements/:id
 * @access Private
 */
export const getAchievementById = catchAsync(
  async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return next(createError("Invalid achievement ID", 400));
    }

    const achievement = await Achievement.findById(id);
    if (!achievement) {
      return next(createError("Achievement not found", 404));
    }

    sendResponse(res, 200, true, "Achievement retrieved successfully", { achievement });
  }
);

/**
 * @desc Create a new achievement
 * @route POST /api/achievements
 * @access Private
 */
export const addAchievement = catchAsync(
  async (
    req: Request<{}, {}, { name: string; description: string; requirements: number }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { name, description, requirements } = req.body;
    const userIdString = req.user?.id;

    if (!mongoose.isValidObjectId(userIdString)) {
      return next(createError("Invalid User ID format.", 400));
    }

    if (!name || !description || !requirements) {
      return next(createError("Name, description, and requirements are required", 400));
    }

    const newAchievement = await Achievement.create({ name, description, requirements });

    sendResponse(res, 201, true, "Achievement created successfully", { achievement: newAchievement });
  }
);

/**
 * @desc Update an achievement
 * @route PUT /api/achievements/:id
 * @access Private
 */
export const updateAchievement = catchAsync(
  async (
    req: Request<{ id: string }, {}, { name?: string; description?: string; requirements?: number }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return next(createError("Invalid achievement ID", 400));
    }

    const achievement = await Achievement.findById(id);
    if (!achievement) {
      return next(createError("Achievement not found", 404));
    }

    Object.assign(achievement, updates);
    await achievement.save();

    sendResponse(res, 200, true, "Achievement updated successfully", { achievement });
  }
);

/**
 * @desc Delete an achievement
 * @route DELETE /api/achievements/:id
 * @access Private
 */
export const deleteAchievement = catchAsync(
  async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return next(createError("Invalid achievement ID", 400));
    }

    const achievement = await Achievement.findById(id);
    if (!achievement) {
      return next(createError("Achievement not found", 404));
    }

    await achievement.deleteOne();

    sendResponse(res, 200, true, "Achievement deleted successfully");
  }
);

/**
 * @desc Get leaderboard achievements (Admin only)
 * @route GET /api/achievements/leaderboard
 * @access Private/Admin
 */
export const getLeaderboardAchievements = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.user?.role !== "admin") {
      return next(createError("Access denied", 403));
    }

    const achievements = await Achievement.find().sort({ createdAt: -1 });

    sendResponse(res, 200, true, "Leaderboard achievements retrieved successfully", { achievements });
  }
);

/**
 * ✅ Export all controllers correctly
 */
export default {
  getAllAchievements,
  getAchievementById,
  addAchievement,
  updateAchievement,
  deleteAchievement,
  getLeaderboardAchievements,
  checkStreakAchievements
};
