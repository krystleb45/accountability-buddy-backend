import type { Request, Response, NextFunction } from "express";
import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import User from "./User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

// Define the IReward interface
export interface IReward extends Document {
  _id: Types.ObjectId; // Explicitly define _id as ObjectId
  title: string;
  description?: string;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for Reward
const RewardSchema: Schema<IReward> = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    points: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }, // Adds createdAt and updatedAt fields automatically
);

// Create the Reward model
const Reward: Model<IReward> = mongoose.model<IReward>("Reward", RewardSchema);

// Export both the model and interface
export { Reward };


/**
 * @desc Get user rewards
 * @route GET /api/rewards
 * @access Private
 */
export const getUserRewards = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly define generics
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = req.user?.id;

    // Fetch user and populate rewards as ObjectIds
    const user = await User.findById(userId).populate("rewards");
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    // Ensure rewards array exists and is populated
    const rewards = user.rewards || [];
    sendResponse(res, 200, true, "User rewards fetched successfully", { rewards });
  },
);

/**
 * @desc Redeem a reward
 * @route POST /api/rewards/redeem
 * @access Private
 */
export const redeemReward = catchAsync(
  async (
    req: Request<{}, any, { rewardId: string }>,
    res: Response,
  ): Promise<void> => {
    const { rewardId } = req.body;
    const userId = req.user?.id;

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    // Fetch reward
    const reward = await Reward.findById(rewardId);
    if (!reward) {
      sendResponse(res, 404, false, "Reward not found");
      return;
    }

    // Check user's points
    const userPoints = user.points ?? 0;
    if (userPoints < reward.points) {
      sendResponse(res, 400, false, "Insufficient points to redeem this reward");
      return;
    }

    // Deduct points and add reward ID to user's redeemed rewards
    user.points = userPoints - reward.points; // Deduct points
    user.rewards.push(reward._id as mongoose.Types.ObjectId); // Explicit cast for ObjectId
    await user.save(); // Save changes

    sendResponse(res, 200, true, "Reward redeemed successfully", { reward });
  },
);



/**
 * @desc Create a new reward (Admin only)
 * @route POST /api/rewards/create
 * @access Private (Admin only)
 */
export const createReward = catchAsync(
  async (
    req: Request<{}, any, { title: string; description?: string; points: number }>,
    res: Response,
  ): Promise<void> => {
    const { title, description, points } = req.body;

    // Validate input
    if (!title || !points) {
      sendResponse(res, 400, false, "Title and points are required");
      return;
    }

    // Create reward
    const newReward = await Reward.create({
      title,
      description,
      points,
    });

    sendResponse(res, 201, true, "Reward created successfully", { reward: newReward });
  },
);

/**
 * @desc Award points to a user
 * @param userId - ID of the user
 * @param points - Number of points to award
 */
export const awardPoints = async (userId: string, points: number): Promise<void> => {
  // Fetch the user
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Safely update points
  user.points = (user.points || 0) + points;
  await user.save();
};
