import type { Request, Response, NextFunction } from "express";
import XpHistory, { IXpHistory } from "../models/XpHistory";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import mongoose from "mongoose";

/**
 * @desc    Record a new XP entry for a user
 * @route   POST /api/xp-history
 * @access  Private
 */
export const createXpEntry = catchAsync(
  async (req: Request<{}, {}, { xp: number; reason: string }>, res: Response, _next: NextFunction) => {
    const userId = req.user?.id;
    const { xp, reason } = req.body;
    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }
    if (typeof xp !== "number" || !reason) {
      sendResponse(res, 400, false, "XP and reason are required");
      return;
    }
    const entry = await XpHistory.create({
      userId: new mongoose.Types.ObjectId(userId),
      xp,
      reason,
    } as IXpHistory);
    sendResponse(res, 201, true, "XP entry created", { entry });
  }
);

/**
 * @desc    Get XP history for the authenticated user
 * @route   GET /api/xp-history
 * @access  Private
 */
export const getMyXpHistory = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const userId = _req.user?.id;
    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }
    const entries = await XpHistory.find({ userId }).sort({ date: -1 });
    sendResponse(res, 200, true, "XP history fetched", { entries });
  }
);

/**
 * @desc    (Admin) Get all XP history entries
 * @route   GET /api/xp-history/all
 * @access  Private/Admin
 */
export const getAllXpHistory = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const entries = await XpHistory.find().sort({ date: -1 });
    sendResponse(res, 200, true, "All XP entries fetched", { entries });
  }
);
