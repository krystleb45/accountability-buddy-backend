// src/api/services/RewardService.ts
import { Types } from "mongoose";
import { Reward, IReward } from "../models/Reward";
import { User, IUser } from "../models/User";
import Redemption from "../models/Redemption";
import { createError } from "../middleware/errorHandler";
import { logger } from "../../utils/winstonLogger";

export interface PaginatedRewards {
  items: IReward[];
  total: number;
}

/**
 * Manage rewards: creation, listing, retrieval, redemption.
 */
class RewardService {
  /**
   * Create a new reward.
   */
  static async createReward(data: {
    name: string;
    description: string;
    pointsRequired: number;
    rewardType: IReward["rewardType"];
    imageUrl?: string;
  }): Promise<IReward> {
    const { name, description, pointsRequired, rewardType, imageUrl } = data;
    const existing = await Reward.findOne({ name });
    if (existing) throw createError("Reward name must be unique", 409);

    const reward = await Reward.create({
      name,
      description,
      pointsRequired,
      rewardType,
      imageUrl: imageUrl || "",
      createdAt: new Date(),
    });

    logger.info(`Reward created: ${reward._id}`);
    return reward;
  }

  /**
   * List all rewards, optionally filtering by type or by maxPoints.
   */
  static async listRewards(opts?: {
    page?: number;
    limit?: number;
    type?: IReward["rewardType"];
    maxPoints?: number;
  }): Promise<PaginatedRewards> {
    const page = Math.max(1, opts?.page || 1);
    const limit = Math.min(100, Math.max(1, opts?.limit || 20));
    const filter: Record<string, any> = {};

    if (opts?.type) filter.rewardType = opts.type;
    if (opts?.maxPoints != null) filter.pointsRequired = { $lte: opts.maxPoints };

    const [items, total] = await Promise.all([
      Reward.find(filter)
        .sort({ pointsRequired: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      Reward.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * Fetch a single reward by ID.
   */
  static async getById(rewardId: string): Promise<IReward> {
    if (!Types.ObjectId.isValid(rewardId)) {
      throw createError("Invalid reward ID", 400);
    }
    const reward = await Reward.findById(rewardId);
    if (!reward) throw createError("Reward not found", 404);
    return reward;
  }

  /**
   * Redeem a reward for a user: checks points, deducts, records redemption.
   */
  static async redeemReward(userId: string, rewardId: string): Promise<{
    user: IUser;
    reward: IReward;
    remainingPoints: number;
  }> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(rewardId)) {
      throw createError("Invalid user or reward ID", 400);
    }

    const [user, reward] = await Promise.all([
      User.findById(userId),
      Reward.findById(rewardId),
    ]);

    if (!user) throw createError("User not found", 404);
    if (!reward) throw createError("Reward not found", 404);

    const current = user.points ?? 0;
    if (current < reward.pointsRequired) {
      throw createError("Insufficient points", 400);
    }

    // Deduct points
    user.points = current - reward.pointsRequired;
    await user.save();

    // Record redemption
    await Redemption.create({
      user: user._id,
      reward: reward._id,
      redeemedAt: new Date(),
    });

    logger.info(`User ${userId} redeemed reward ${rewardId}`);
    return { user, reward, remainingPoints: user.points };
  }
}

/**
 * Award a given number of points to a user.
 * Used by BadgeService (and any other point-awarding workflows).
 */
export async function awardPoints(userId: string, points: number): Promise<void> {
  if (!Types.ObjectId.isValid(userId)) {
    throw createError("Invalid user ID", 400);
  }
  const user = await User.findById(userId);
  if (!user) throw createError("User not found", 404);

  user.points = (user.points ?? 0) + points;
  await user.save();
  logger.info(`Awarded ${points} points to user ${userId}`);
}

export default RewardService;
