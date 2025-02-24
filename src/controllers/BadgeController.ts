import type { Request, Response } from "express";
import type { IBadge, BadgeLevel, BadgeType } from "../models/Badge";
import Badge from "../models/Badge";
import BadgeProgress from "../models/BadgeProgress";
import { awardPoints } from "../controllers/RewardController";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import logger from "../utils/winstonLogger";
import sanitize from "mongo-sanitize";
import mongoose from "mongoose";

// ✅ Define Badge Levels
const badgeLevels: BadgeLevel[] = ["Bronze", "Silver", "Gold"];

// ✅ Get the next badge level
const getNextBadgeLevel = (currentLevel: BadgeLevel): BadgeLevel => {
  const currentIndex = badgeLevels.indexOf(currentLevel);
  return currentIndex < badgeLevels.length - 1 ? badgeLevels[currentIndex + 1] : currentLevel;
};

/**
 * @desc    Award a badge to a user
 * @route   POST /api/badges/award
 * @access  Private
 */
export const awardBadge = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userId: userIdString, badgeType, level = "Bronze" } = sanitize(req.body);

  if (!mongoose.isValidObjectId(userIdString)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }

  const userId = new mongoose.Types.ObjectId(userIdString);

  if (!badgeType) {
    sendResponse(res, 400, false, "Badge type is required.");
    return;
  }

  // ✅ Check if the user already has the badge
  const existingBadge = await Badge.findOne({ user: userId, badgeType });

  if (existingBadge) {
    const currentLevel = existingBadge.level as BadgeLevel;
    const newLevel = getNextBadgeLevel(currentLevel);

    if (newLevel !== currentLevel) {
      existingBadge.level = newLevel;
      await existingBadge.save();
      logger.info(`Badge upgraded to ${newLevel} for user: ${userId}`);
      sendResponse(res, 200, true, "Badge upgraded successfully", { badge: existingBadge });
      return;
    }

    sendResponse(res, 200, true, "User already has the highest badge level", { badge: existingBadge });
    return;
  }

  // ✅ Create a new badge for the user
  const newBadge = new Badge({ user: userId, badgeType, level });
  await newBadge.save();

  // ✅ Award points to the user
  const points = Badge.awardPointsForBadge(badgeType as IBadge["badgeType"]);
  await awardPoints(userId.toString(), points);

  logger.info(`New badge awarded to user: ${userId.toString()} with type: ${badgeType} at level: ${level}`);
  sendResponse(res, 201, true, "Badge awarded successfully", { badge: newBadge });
});

/**
 * @desc    Update badge progress for a user
 * @route   POST /api/badges/progress/update
 * @access  Private
 */
export const updateBadgeProgress = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { badgeType, increment } = sanitize(req.body);
  const userIdString = req.user?.id;

  if (!mongoose.isValidObjectId(userIdString)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }

  const userId = new mongoose.Types.ObjectId(userIdString);

  if (!badgeType || !increment) {
    sendResponse(res, 400, false, "Badge type and increment are required.");
    return;
  }

  // ✅ Update progress in BadgeProgress model
  const badgeProgress = await BadgeProgress.updateProgress(userId, badgeType as BadgeType, increment);
  sendResponse(res, 200, true, "Badge progress updated successfully.", { badgeProgress });
});

/**
 * @desc    Remove expired badges
 * @route   DELETE /api/badges/expired/remove
 * @access  Private (Admin only)
 */
export const removeExpiredBadges = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const expiredBadges = await Badge.deleteMany({ expiresAt: { $lt: new Date() } });

  sendResponse(res, 200, true, "Expired badges removed successfully.", {
    count: expiredBadges.deletedCount,
  });
});

/**
 * @desc    Fetch all badges for a user
 * @route   GET /api/badges
 * @access  Private
 */
export const getUserBadges = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userIdString = req.user?.id;

  if (!mongoose.isValidObjectId(userIdString)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }

  const userId = new mongoose.Types.ObjectId(userIdString);

  const badges = await Badge.find({ user: userId });
  sendResponse(res, 200, true, "User badges fetched successfully", { badges });
});

/**
 * @desc    Get the user's badge showcase
 * @route   GET /api/badges/showcase
 * @access  Private
 */
export const getUserBadgeShowcase = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userIdString = req.user?.id;

  if (!mongoose.isValidObjectId(userIdString)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }

  const userId = new mongoose.Types.ObjectId(userIdString);

  const showcasedBadges = await Badge.find({ user: userId, isShowcased: true });

  sendResponse(res, 200, true, "User badge showcase fetched successfully", { showcasedBadges });
});

/**
 * @desc    Upgrade a badge level
 * @route   PATCH /api/badges/upgrade
 * @access  Private
 */
export const upgradeBadgeLevel = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { badgeType } = sanitize(req.body);
  const userIdString = req.user?.id;

  if (!mongoose.isValidObjectId(userIdString)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }

  const userId = new mongoose.Types.ObjectId(userIdString);

  if (!badgeType) {
    sendResponse(res, 400, false, "Badge type is required.");
    return;
  }

  const upgradedBadge = await BadgeProgress.upgradeBadgeLevel(userId, badgeType as BadgeType);
  if (!upgradedBadge) {
    sendResponse(res, 404, false, "Badge not found or already at max level.");
    return;
  }

  sendResponse(res, 200, true, "Badge level upgraded successfully.", { upgradedBadge });
});
