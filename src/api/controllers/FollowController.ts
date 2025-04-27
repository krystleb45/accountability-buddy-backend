// src/api/controllers/FollowController.ts
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Follow from "../models/Follow";
import { IUser } from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { createError } from "../middleware/errorHandler";

type AuthReq = Request<{ userId: string }> & { user?: { id: string } };

export default {
  /** POST /api/follow/:userId */
  followUser: catchAsync(async (req: AuthReq, res: Response, next: NextFunction): Promise<void> => {
    const followerId = req.user?.id;
    const targetId   = req.params.userId;

    if (!mongoose.isValidObjectId(targetId)) {
      next(createError("Invalid target user ID", 400));
      return;
    }
    if (!followerId) {
      next(createError("Unauthorized", 401));
      return;
    }
    if (followerId === targetId) {
      next(createError("Cannot follow yourself", 400));
      return;
    }

    const existing = await Follow.findOne({ user: followerId, targetUser: targetId });
    if (existing) {
      sendResponse(res, 200, true, "Already following");
      return;
    }

    await Follow.create({ user: followerId, targetUser: targetId });
    sendResponse(res, 200, true, "Started following user");
    // no return value
  }),

  /** DELETE /api/follow/:userId */
  unfollowUser: catchAsync(async (req: AuthReq, res: Response, next: NextFunction): Promise<void> => {
    const followerId = req.user?.id;
    const targetId   = req.params.userId;

    if (!mongoose.isValidObjectId(targetId)) {
      next(createError("Invalid target user ID", 400));
      return;
    }
    if (!followerId) {
      next(createError("Unauthorized", 401));
      return;
    }

    await Follow.deleteOne({ user: followerId, targetUser: targetId });
    sendResponse(res, 200, true, "Unfollowed user");
  }),

  /** GET /api/follow/followers/:userId */
  getFollowers: catchAsync(async (req: Request<{ userId: string }>, res: Response, next: NextFunction): Promise<void> => {
    const targetId = req.params.userId;

    if (!mongoose.isValidObjectId(targetId)) {
      next(createError("Invalid user ID", 400));
      return;
    }

    const docs = await Follow.find({ targetUser: targetId })
      .populate<{ user: IUser }>("user", "username email avatarUrl")
      .exec();

    const followers = docs.map(d => ({
      id: d.user._id.toString(),
      name: d.user.username,
      avatarUrl: (d.user as any).avatarUrl,
    }));

    sendResponse(res, 200, true, "Fetched followers", { followers });
  }),

  /** GET /api/follow/following/:userId */
  getFollowing: catchAsync(async (req: Request<{ userId: string }>, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.userId;

    if (!mongoose.isValidObjectId(userId)) {
      next(createError("Invalid user ID", 400));
      return;
    }

    const docs = await Follow.find({ user: userId })
      .populate<{ targetUser: IUser }>("targetUser", "username email avatarUrl")
      .exec();

    const following = docs.map(d => ({
      id: d.targetUser._id.toString(),
      name: d.targetUser.username,
      avatarUrl: (d.targetUser as any).avatarUrl,
    }));

    sendResponse(res, 200, true, "Fetched following list", { following });
  }),
};
