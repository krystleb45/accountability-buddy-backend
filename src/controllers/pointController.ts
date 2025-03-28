import { Request, Response, NextFunction } from "express";
import { User } from "../api/models/User";
import Reward from "../api/models/Reward"; // Correct import for the reward model
import catchAsync from "../api/utils/catchAsync";
import sendResponse from "../api/utils/sendResponse";
import { Types } from "mongoose";

// 🟢 Get the current points of a user
export const getPoints = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      return next(new Error("User not authenticated")); // If no user is logged in, throw an error
    }

    const user = await User.findById(userId);

    if (!user) {
      return next(new Error("User not found"));
    }

    sendResponse(res, 200, true, "User points fetched successfully", {
      points: user.points,
    });
  }
);

// 🟢 Redeem points for rewards
export const redeemPoints = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const { rewardId } = req.body;
  
    if (!userId) {
      return next(new Error("User not authenticated"));
    }
  
    const user = await User.findById(userId);
  
    if (!user) {
      return next(new Error("User not found"));
    }
  
    const reward = await Reward.findById(rewardId); // Correct model usage for reward
  
    if (!reward) {
      return next(new Error("Reward not found"));
    }
  
    // Check if the user has enough points (ensure user.points is defined)
    if ((user.points ?? 0) < reward.pointsRequired) {
      return next(new Error("Insufficient points to redeem this reward"));
    }
  
    // Deduct points and update the user's reward list
    user.points = (user.points ?? 0) - reward.pointsRequired; // Safely handle undefined points
  
    // Safely cast reward._id to ObjectId
    user.rewards.push(new Types.ObjectId(reward._id as string));  
    await user.save();
  
    sendResponse(res, 200, true, "Reward redeemed successfully", { reward });
  }
);

// 🟢 Earn points for completing activities
export const earnPoints = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const { points } = req.body; // The points to be awarded

    if (!userId) {
      return next(new Error("User not authenticated"));
    }

    const user = await User.findById(userId);

    if (!user) {
      return next(new Error("User not found"));
    }

    if (points <= 0) {
      return next(new Error("Points must be a positive number"));
    }

    user.points = (user.points ?? 0) + points; // Add points to the user's total

    await user.save();

    sendResponse(res, 200, true, "Points earned successfully", { points: user.points });
  }
);
