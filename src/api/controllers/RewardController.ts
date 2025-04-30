import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import RewardService from "../services/rewardService";
import Redemption from "../models/Redemption";
import { Types } from "mongoose";

/**
 * @desc    List all rewards (optionally filter by maxPoints query)
 * @route   GET /api/rewards
 * @access  Public
 */
export const listRewards = catchAsync(
  async (
    req: Request<{}, {}, {}, { maxPoints?: string; page?: string; limit?: string }>,
    res: Response
  ): Promise<void> => {
    const { maxPoints, page, limit } = req.query;
    const opts: any = {};
    if (!isNaN(Number(page))) opts.page = Number(page);
    if (!isNaN(Number(limit))) opts.limit = Number(limit);
    if (!isNaN(Number(maxPoints))) opts.maxPoints = Number(maxPoints);

    const { items, total } = await RewardService.listRewards(opts);
    sendResponse(res, 200, true, "Rewards fetched successfully", {
      rewards: items,
      pagination: { total, page: opts.page || 1, limit: opts.limit || items.length },
    });
  }
);

/**
 * @desc    Get all the current user’s redeemed rewards
 * @route   GET /api/rewards/my
 * @access  Private
 */
export const getMyRewards = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    if (!Types.ObjectId.isValid(userId)) {
      sendResponse(res, 400, false, "Invalid user ID");
      return;
    }

    // look up redemptions
    const redemptions = await Redemption.find({ user: userId })
      .populate<{ reward: any }>("reward")
      .sort({ redeemedAt: -1 })
      .lean();

    const rewards = redemptions.map((r) => r.reward);
    sendResponse(res, 200, true, "Your redeemed rewards", { rewards });
  }
);

/**
 * @desc    Redeem a reward for the current user
 * @route   POST /api/rewards/redeem
 * @access  Private
 */
export const redeemReward = catchAsync(
  async (
    req: Request<{}, {}, { rewardId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { rewardId } = req.body;
    const userId = req.user!.id;

    try {
      const { reward, remainingPoints } = await RewardService.redeemReward(
        userId,
        rewardId
      );
      sendResponse(
        res,
        200,
        true,
        "Reward redeemed successfully",
        { reward, remainingPoints }
      );
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @desc    Create a new reward (Admin only)
 * @route   POST /api/rewards/create
 * @access  Private/Admin
 */
export const createReward = catchAsync(
  async (
    req: Request<{}, {}, {
      name: string;
      description: string;
      pointsRequired: number;
      rewardType: string;
      imageUrl?: string;
    }>,
    res: Response
  ): Promise<void> => {
    const { name, description, pointsRequired, rewardType, imageUrl } = req.body;
    const newReward = await RewardService.createReward({
      name,
      description,
      pointsRequired,
      rewardType: rewardType as any,
      imageUrl,
    });
    sendResponse(res, 201, true, "Reward created successfully", {
      reward: newReward,
    });
  }
);

export default {
  listRewards,
  getMyRewards,
  redeemReward,
  createReward,
};
