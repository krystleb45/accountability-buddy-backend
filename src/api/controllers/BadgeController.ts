import type { Request, Response } from "express";
import type { IBadge, BadgeLevel, BadgeType } from "../models/Badge";
import Badge from "../models/Badge";
import BadgeProgress from "../models/BadgeProgress";
import { awardPoints } from "./RewardController";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { logger } from "../../utils/winstonLogger";
import sanitize from "mongo-sanitize";
import mongoose from "mongoose";
import { getCache, setCache } from "../../utils/cacheHelper";

// ✅ Define Badge Levels
const badgeLevels: BadgeLevel[] = ["Bronze", "Silver", "Gold"];

// ✅ Utility to get the next badge level
const getNextBadgeLevel = (currentLevel: BadgeLevel): BadgeLevel => {
  const currentIndex = badgeLevels.indexOf(currentLevel);
  return currentIndex < badgeLevels.length - 1 ? badgeLevels[currentIndex + 1] : currentLevel;
};

/**
 * Award a badge to a user.
 * @route   POST /api/badges/award
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

  // Check if the user already has the badge
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

  // Create a new badge for the user
  const newBadge = new Badge({ user: userId, badgeType, level });
  await newBadge.save();

  // Award points to the user
  const points = Badge.awardPointsForBadge(badgeType as IBadge["badgeType"]);
  await awardPoints(userId.toString(), points);

  logger.info(`New badge awarded to user: ${userId.toString()} with type: ${badgeType} at level: ${level}`);
  sendResponse(res, 201, true, "Badge awarded successfully", { badge: newBadge });
});

/**
 * Batch process awarding badges to multiple users.
 * (This function is exported but not used in the merged routes.)
 */
export const batchAwardBadges = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userIds, badgeType, level = "Bronze" } = sanitize(req.body);

  if (!Array.isArray(userIds) || userIds.length === 0) {
    sendResponse(res, 400, false, "User IDs array is required.");
    return;
  }

  // Validate user IDs
  const validUserIds = userIds.filter((userId: string) => mongoose.isValidObjectId(userId));
  if (validUserIds.length === 0) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }

  // Award badges in bulk
  const bulkOperations = validUserIds.map((userId: string) => ({
    updateOne: {
      filter: { user: new mongoose.Types.ObjectId(userId), badgeType },
      update: { $set: { badgeType, level } },
      upsert: true,
    },
  }));

  if (bulkOperations.length > 0) {
    await Badge.bulkWrite(bulkOperations);
  }

  // Award points for all users in bulk
  const points = Badge.awardPointsForBadge(badgeType as IBadge["badgeType"]);
  for (const userId of validUserIds) {
    await awardPoints(userId, points);
  }

  logger.info(`Badges awarded in bulk for users: ${validUserIds.join(", ")}`);
  sendResponse(res, 200, true, "Badges awarded successfully in bulk.", { userIds: validUserIds });
});

/**
 * Fetch all badges for a user with caching.
 * @route   GET /api/badges
 */
export const getUserBadges = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userIdString = req.user?.id;
  if (!mongoose.isValidObjectId(userIdString)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }
  const userId = new mongoose.Types.ObjectId(userIdString);

  // Check if badges are cached
  const cachedBadges = await getCache(`userBadges:${userId}`);
  if (cachedBadges) {
    sendResponse(res, 200, true, "User badges fetched from cache", { badges: cachedBadges });
    return;
  }

  // Fetch badges from DB if not cached
  const badges = await Badge.find({ user: userId });
  await setCache(`userBadges:${userId}`, badges);

  sendResponse(res, 200, true, "User badges fetched successfully", { badges });
});

/**
 * Get showcased badges for the logged-in user.
 * Assumes that the Badge model has an `isShowcased` boolean field.
 * @route   GET /api/badges/showcase
 */
export const getUserBadgeShowcase = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userIdString = req.user?.id;
  if (!mongoose.isValidObjectId(userIdString)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }
  const userId = new mongoose.Types.ObjectId(userIdString);

  // Fetch badges that are showcased
  const badges = await Badge.find({ user: userId, isShowcased: true });
  sendResponse(res, 200, true, "User badge showcase fetched successfully", { badges });
});

/**
 * Update badge progress for a user.
 * Expects `badgeType` and a numeric `increment` in the request body.
 * @route   POST /api/badges/progress/update
 */
export const updateBadgeProgress = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { badgeType, increment } = sanitize(req.body);
  const userIdString = req.user?.id;
  if (!mongoose.isValidObjectId(userIdString)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }
  const userId = new mongoose.Types.ObjectId(userIdString);

  // Find existing progress record or create a new one
  let progress = await BadgeProgress.findOne({ user: userId, badgeType });
  if (!progress) {
    progress = new BadgeProgress({ user: userId, badgeType, progress: Number(increment) });
  } else {
    progress.progress += Number(increment);
  }
  await progress.save();

  sendResponse(res, 200, true, "Badge progress updated successfully.", { progress });
});

/**
 * Upgrade a badge level for the logged-in user.
 * @route   POST /api/badges/upgrade
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

/**
 * Remove expired badges for a user.
 * Assumes that the Badge model has an `expired` property.
 * @route   DELETE /api/badges/expired/remove
 */
export const removeExpiredBadges = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userIdString = req.user?.id;
  if (!mongoose.isValidObjectId(userIdString)) {
    sendResponse(res, 400, false, "Invalid User ID format.");
    return;
  }
  const userId = new mongoose.Types.ObjectId(userIdString);

  // Delete badges marked as expired
  const result = await Badge.deleteMany({ user: userId, expired: true });
  if (result.deletedCount && result.deletedCount > 0) {
    sendResponse(res, 200, true, "Expired badges removed successfully.");
  } else {
    sendResponse(res, 404, false, "No expired badges found for removal.");
  }
});
