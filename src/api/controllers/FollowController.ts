// src/api/controllers/FollowController.ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import FriendService from "../services/FriendService";

export default {
  followUser: catchAsync(async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
    const me   = req.user!.id;
    const them = req.params.userId;

    try {
      await FriendService.follow(me, them);
      sendResponse(res, 200, true, "Started following user");
    } catch (err) {
      return next(err);
    }
  }),

  unfollowUser: catchAsync(async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
    const me   = req.user!.id;
    const them = req.params.userId;

    try {
      await FriendService.unfollow(me, them);
      sendResponse(res, 200, true, "Stopped following user");
    } catch (err) {
      return next(err);
    }
  }),

  getFollowers: catchAsync(async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
    try {
      const list = await FriendService.getFollowers(req.params.userId);
      sendResponse(res, 200, true, "Fetched followers", { followers: list });
    } catch (err) {
      return next(err);
    }
  }),

  getFollowing: catchAsync(async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
    try {
      const list = await FriendService.getFollowing(req.params.userId);
      sendResponse(res, 200, true, "Fetched following", { following: list });
    } catch (err) {
      return next(err);
    }
  }),
};
