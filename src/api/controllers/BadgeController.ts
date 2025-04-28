import type { Request, Response } from "express";
import { Types } from "mongoose";
import sanitize from "mongo-sanitize";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import BadgeService from "../services/BadgeService";

export const awardBadge = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userId, badgeType, level } = sanitize(req.body);

  if (!Types.ObjectId.isValid(userId) || !badgeType) {
    sendResponse(res, 400, false, "userId and badgeType are required");
    return;
  }

  const badge = await BadgeService.awardBadge(userId, badgeType, level);
  sendResponse(res, 201, true, "Badge awarded", { badge });
  return;
});


export const batchAwardBadges = catchAsync(async (req: Request, res: Response) => {
  const { userIds, badgeType, level } = sanitize(req.body);
  const awarded = await BadgeService.batchAward(userIds, badgeType, level);
  sendResponse(res, 200, true, "Badges awarded", { userIds: awarded });
});

export const getUserBadges = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const badges = await BadgeService.getUserBadges(userId);
  sendResponse(res, 200, true, "User badges", { badges });
});

export const getUserBadgeShowcase = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const badges = await BadgeService.getShowcase(userId);
  sendResponse(res, 200, true, "Badge showcase", { badges });
});

export const updateBadgeProgress = catchAsync(async (req: Request, res: Response) => {
  const { badgeType, increment } = sanitize(req.body);
  const prog = await BadgeService.updateProgress(
    req.user!.id,
    badgeType,
    Number(increment)
  );
  sendResponse(res, 200, true, "Progress updated", { progress: prog });
});

export const removeExpiredBadges = catchAsync(async (req: Request, res: Response) => {
  const removedCount = await BadgeService.removeExpired(req.user!.id);
  if (removedCount) {
    sendResponse(res, 200, true, "Expired badges removed", { count: removedCount });
  } else {
    sendResponse(res, 404, false, "No expired badges");
  }
});

export default {
  awardBadge,
  batchAwardBadges,
  getUserBadges,
  getUserBadgeShowcase,
  updateBadgeProgress,
  removeExpiredBadges,
};
