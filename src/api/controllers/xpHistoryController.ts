// src/api/controllers/XpHistoryController.ts
import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import XpHistoryService from "../services/XpHistoryService";

/**
 * @desc    Record a new XP entry for a user
 * @route   POST /api/xp-history
 * @access  Private
 */
export const createXpEntry = catchAsync(
  async (
    req: Request<{}, {}, { xp: number; reason: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.user?.id;
    const { xp, reason } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    // Service will validate and throw if invalid
    const entry = await XpHistoryService.createEntry(userId, xp, reason);
    sendResponse(res, 201, true, "XP entry created", { entry });
  }
);

/**
 * @desc    Get XP history for the authenticated user
 * @route   GET /api/xp-history
 * @access  Private
 */
export const getMyXpHistory = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = _req.user?.id;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    const entries = await XpHistoryService.getUserHistory(userId);
    sendResponse(res, 200, true, "XP history fetched", { entries });
  }
);

/**
 * @desc    (Admin) Get all XP history entries
 * @route   GET /api/xp-history/all
 * @access  Private/Admin
 */
export const getAllXpHistory = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const entries = await XpHistoryService.getAllHistory();
    sendResponse(res, 200, true, "All XP entries fetched", { entries });
  }
);

export default {
  createXpEntry,
  getMyXpHistory,
  getAllXpHistory,
};
