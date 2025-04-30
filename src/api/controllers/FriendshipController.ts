// src/api/controllers/FriendshipController.ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import FriendService from "../services/FriendService";

export default {
  sendFriendRequest: catchAsync(async (req: Request<{}, {}, { recipientId: string }>, res: Response, next: NextFunction) => {
    const me = req.user!.id;
    const them = req.body.recipientId;

    try {
      await FriendService.sendRequest(me, them);
      sendResponse(res, 201, true, "Friend request sent");
    } catch (err) {
      return next(err);
    }
  }),

  acceptFriendRequest: catchAsync(async (req: Request<{}, {}, { requestId: string }>, res: Response, next: NextFunction) => {
    const me = req.user!.id;
    const id = req.body.requestId;

    try {
      await FriendService.acceptRequest(id, me);
      sendResponse(res, 200, true, "Friend request accepted");
    } catch (err) {
      return next(err);
    }
  }),

  rejectFriendRequest: catchAsync(async (req: Request<{ requestId: string }>, res: Response, next: NextFunction) => {
    const me = req.user!.id;
    const id = req.params.requestId;

    try {
      await FriendService.rejectRequest(id, me);
      sendResponse(res, 200, true, "Friend request rejected");
    } catch (err) {
      return next(err);
    }
  }),

  cancelFriendRequest: catchAsync(async (req: Request<{ requestId: string }>, res: Response, next: NextFunction) => {
    const me = req.user!.id;
    const id = req.params.requestId;

    try {
      await FriendService.cancelRequest(id, me);
      sendResponse(res, 200, true, "Friend request canceled");
    } catch (err) {
      return next(err);
    }
  }),

  removeFriend: catchAsync(async (req: Request<{ friendId: string }>, res: Response, next: NextFunction) => {
    const me   = req.user!.id;
    const them = req.params.friendId;

    try {
      await FriendService.removeFriend(me, them);
      sendResponse(res, 200, true, "Friend removed");
    } catch (err) {
      return next(err);
    }
  }),

  getFriendsList: catchAsync(async (_req, res, next) => {
    const me = _req.user!.id;
    try {
      const list = await FriendService.listFriends(me);
      sendResponse(res, 200, true, "Friends list", { friends: list });
    } catch (err) {
      return next(err);
    }
  }),

  getPendingFriendRequests: catchAsync(async (_req, res, next) => {
    const me = _req.user!.id;
    try {
      const list = await FriendService.pendingRequests(me);
      sendResponse(res, 200, true, "Pending requests", { requests: list });
    } catch (err) {
      return next(err);
    }
  }),

  getAIRecommendedFriends: catchAsync(async (_req, res, next) => {
    const me = _req.user!.id;
    try {
      const recs = await FriendService.aiRecommendations(me);
      sendResponse(res, 200, true, "Recommendations", { recommendedFriends: recs });
    } catch (err) {
      return next(err);
    }
  }),
};
