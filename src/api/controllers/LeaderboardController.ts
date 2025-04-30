// src/api/controllers/LeaderboardController.ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import LeaderboardService from "../services/LeaderboardService";
import { AuthenticatedRequest } from "../../types/AuthenticatedRequest";

export const getLeaderboard = catchAsync(
  async (req: Request<{}, {}, {}, { limit?: string; page?: string }>, res: Response) => {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "10", 10)));
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const { data, pagination } = await LeaderboardService.fetchPage(limit, page);

    sendResponse(res, 200, true, "Leaderboard fetched successfully", {
      leaderboard: data,
      pagination,
    });
  }
);

export const getUserLeaderboardPosition = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id!;
    const { position, entry } = await LeaderboardService.getUserPosition(userId);
    sendResponse(res, 200, true, "User leaderboard position fetched", {
      userPosition: position,
      userEntry: entry,
    });
  }
);

export const resetLeaderboard = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user?.role || authReq.user.role !== "admin") {
      sendResponse(res, 403, false, "Access denied");
      return;
    }
    await LeaderboardService.resetAll();
    sendResponse(res, 200, true, "Leaderboard reset successfully");
  }
);

// this last one isn’t an Express handler but is exported for you to call
export const updateLeaderboardForUser = LeaderboardService.updateForUser;
