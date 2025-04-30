// src/api/controllers/PointController.ts
import type { Request, Response, NextFunction } from "express";
import * as PointService from "../services/PointsService";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";


/**
 * @desc    Add points to the authenticated user
 * @route   POST /api/points/add
 * @access  Private
 */
export const addPoints = catchAsync(
  async (
    req: Request<{}, {}, { points: number }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.user!.id;
    const { points } = req.body;
    if (typeof points !== "number" || points <= 0) {
      sendResponse(res, 400, false, "Points must be a positive number");
      return;
    }
    const updatedUser = await PointService.addPoints(userId, points);
    sendResponse(res, 200, true, `Added ${points} points`, { user: updatedUser });
  }
);

/**
 * @desc    Subtract points from the authenticated user
 * @route   POST /api/points/subtract
 * @access  Private
 */
export const subtractPoints = catchAsync(
  async (
    req: Request<{}, {}, { points: number }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.user!.id;
    const { points } = req.body;
    if (typeof points !== "number" || points <= 0) {
      sendResponse(res, 400, false, "Points must be a positive number");
      return;
    }
    const updatedUser = await PointService.subtractPoints(userId, points);
    sendResponse(res, 200, true, `Subtracted ${points} points`, { user: updatedUser });
  }
);

/**
 * @desc    Get current points balance of the authenticated user
 * @route   GET /api/points
 * @access  Private
 */
export const getUserPoints = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const userId = _req.user!.id;
    const points = await PointService.getUserPoints(userId);
    sendResponse(res, 200, true, "Current points fetched successfully", { points });
  }
);

/**
 * @desc    Redeem points for a reward
 * @route   POST /api/points/redeem
 * @access  Private
 */
export const redeemPoints = catchAsync(
  async (
    req: Request<{}, {}, { rewardId: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.user!.id;
    const { rewardId } = req.body;
    if (!rewardId) {
      sendResponse(res, 400, false, "Reward ID is required");
      return;
    }
    const result = await PointService.redeemPoints(userId, rewardId);
    sendResponse(res, 200, true, result.message, {
      reward: result.reward,
      userPoints: result.userPoints,
    });
  }
);

export default {
  addPoints,
  subtractPoints,
  getUserPoints,
  redeemPoints,
};
