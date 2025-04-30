// src/api/controllers/StreakController.ts
import type { Request, Response } from "express";
import mongoose from "mongoose";
import * as StreakService from "../services/StreakService";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

/**
 * @desc    Get user's streak details
 * @route   GET /api/streaks
 * @access  Private
 */
export const getUserStreak = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id!;
  if (!mongoose.isValidObjectId(userId)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }

  const streak = await StreakService.getUserStreak(userId);
  sendResponse(res, 200, true, "User streak fetched successfully", { streak });
});

/**
 * @desc    Log a daily check-in for the user
 * @route   POST /api/streaks/check-in
 * @access  Private
 */
export const logDailyCheckIn = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id!;
  if (!mongoose.isValidObjectId(userId)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }

  const streak = await StreakService.logDailyCheckIn(userId);
  sendResponse(res, 200, true, "Daily check-in successful", { streak });
});

/**
 * @desc    Reset user's streak (Admin only)
 * @route   DELETE /api/streaks/reset
 * @access  Private/Admin
 */
export const resetUserStreak = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = req.body.userId as string;
  if (!mongoose.isValidObjectId(userId)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }

  await StreakService.resetUserStreak(userId);
  sendResponse(res, 200, true, "User streak reset successfully");
});

/**
 * @desc    Get the streak leaderboard
 * @route   GET /api/streaks/leaderboard
 * @access  Public
 */
export const getStreakLeaderboard = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 10);
  const page  = Math.max(1,  parseInt(req.query.page  as string, 10) || 1);

  const { streaks, pagination } = await StreakService.getStreakLeaderboard(limit, page);
  sendResponse(res, 200, true, "Streak leaderboard fetched successfully", {
    streaks,
    pagination,
  });
});
