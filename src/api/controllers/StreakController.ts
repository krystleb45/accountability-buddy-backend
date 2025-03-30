import { Request, Response } from "express";
import Streak from "../models/Streak";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { logger } from "../../utils/winstonLogger";
import mongoose from "mongoose";

/**
 * @desc    Get user's streak details
 * @route   GET /api/streaks
 * @access  Private
 */
export const getUserStreak = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userIdString = req.user?.id;

  if (!mongoose.isValidObjectId(userIdString)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }

  const userId = new mongoose.Types.ObjectId(userIdString);

  const streak = await Streak.findOne({ user: userId }).populate("user", "username");

  if (!streak) {
    sendResponse(res, 404, false, "Streak not found for this user.");
    return;
  }

  sendResponse(res, 200, true, "User streak fetched successfully", { streak });
});

/**
 * @desc    Log a daily check-in for the user
 * @route   POST /api/streaks/check-in
 * @access  Private
 */
export const logDailyCheckIn = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userIdString = req.user?.id;

  if (!mongoose.isValidObjectId(userIdString)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }

  const userId = new mongoose.Types.ObjectId(userIdString);

  // Check if the user already has a streak record
  let streak = await Streak.findOne({ user: userId });

  // If no streak record, create a new one
  if (!streak) {
    streak = new Streak({
      user: userId,
      lastCheckIn: new Date(),
      streakCount: 1,
    });
    await streak.save();
  } else {
    const lastCheckInDate = streak.lastCheckIn ? streak.lastCheckIn.toISOString().split("T")[0] : null; // Null check for lastCheckIn
    const todayDate = new Date().toISOString().split("T")[0];
  
    // If the user has already checked in today
    if (lastCheckInDate === todayDate) {
      sendResponse(res, 400, false, "You have already checked in today.");
      return;
    }
  
    // If lastCheckIn is null (meaning no check-in yet), treat it as the first check-in
    if (lastCheckInDate === null) {
      streak.lastCheckIn = new Date(); // Set the check-in to today
      streak.streakCount = 1; // Start a new streak
      await streak.save();
      sendResponse(res, 200, true, "Check-in successful. Streak started!");
      return;
    }
  
    // If the user checked in yesterday, increment the streak
    const isYesterday = lastCheckInDate && new Date(lastCheckInDate).getDate() === new Date(Date.now() - 86400000).getDate();
  
    if (isYesterday) {
      streak.streakCount += 1; // Increment the streak count
    } else {
      streak.streakCount = 1; // Reset streak if the user missed a day
    }
  
    streak.lastCheckIn = new Date(); // Update last check-in to today
    await streak.save();
  }
  
  logger.info(`Daily check-in logged for user: ${userId}`);
  sendResponse(res, 200, true, "Daily check-in successful", { streak });
  
});

/**
 * @desc    Reset user's streak (Admin only)
 * @route   DELETE /api/streaks/reset
 * @access  Private/Admin
 */
export const resetUserStreak = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userIdString = req.body.userId;

  if (!mongoose.isValidObjectId(userIdString)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }

  const userId = new mongoose.Types.ObjectId(userIdString);

  // Check if user has a streak
  const streak = await Streak.findOne({ user: userId });

  if (!streak) {
    sendResponse(res, 404, false, "No streak found for this user.");
    return;
  }

  streak.streakCount = 0;
  streak.lastCheckIn = null;
  await streak.save();

  logger.info(`Streak reset for user: ${userId}`);
  sendResponse(res, 200, true, "User streak reset successfully");
});

/**
 * @desc    Get the streak leaderboard
 * @route   GET /api/streaks/leaderboard
 * @access  Public
 */
export const getStreakLeaderboard = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const page = parseInt(req.query.page as string, 10) || 1;

  const streaks = await Streak.find()
    .sort({ streakCount: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("user", "username profilePicture");

  const totalEntries = await Streak.countDocuments();
  const totalPages = Math.ceil(totalEntries / limit);

  sendResponse(res, 200, true, "Streak leaderboard fetched successfully", {
    streaks,
    pagination: {
      totalEntries,
      currentPage: page,
      totalPages,
    },
  });
});
