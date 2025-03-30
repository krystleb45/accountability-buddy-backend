import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { User } from "../models/User"; // Correct path
import Reward from "../models/Reward";  // Correct import for the Reward model (default import)
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import Review from "@src/api/models/Review"; // Ensure correct path

/**
 * @desc Get user rewards
 * @route GET /api/rewards
 * @access Private
 */
export const getUserRewards = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    const user = await User.findById(userId).populate("rewards");

    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    sendResponse(res, 200, true, "User rewards fetched successfully", { rewards: user.rewards ?? [] });
  }
);

/**
 * @desc Redeem a reward
 * @route POST /api/rewards/redeem
 * @access Private
 */
export const redeemReward = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { rewardId } = req.body;
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    const reward = await Reward.findById(rewardId);
    if (!reward) {
      sendResponse(res, 404, false, "Reward not found");
      return;
    }

    const userPoints = user.points ?? 0;
    if (userPoints < reward.pointsRequired) {  // Fixing the points field to `pointsRequired`
      sendResponse(res, 400, false, "Insufficient points to redeem this reward");
      return;
    }

    // Deduct points and update the user's reward list
    user.points = userPoints - reward.pointsRequired;
    user.rewards.push(reward._id as Types.ObjectId);  // Ensure reward._id is treated as ObjectId
    await user.save();

    sendResponse(res, 200, true, "Reward redeemed successfully", { reward });
  }
);

/**
 * @desc Create a new reward (Admin only)
 * @route POST /api/rewards/create
 * @access Private (Admin only)
 */
export const createReward = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { title, description, pointsRequired, rewardType, imageUrl } = req.body;

    if (!title || !pointsRequired || !rewardType) {
      sendResponse(res, 400, false, "Title, points, and rewardType are required");
      return;
    }

    const newReward = await Reward.create({
      title,  // Use `title` as per the updated model
      description,
      pointsRequired,
      rewardType,
      imageUrl,
    });

    sendResponse(res, 201, true, "Reward created successfully", { reward: newReward });
  }
);

/**
 * @desc Award points to a user
 * @param userId - ID of the user
 * @param points - Number of points to award
 */
export const awardPoints = async (userId: string, points: number): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.points = (user.points ?? 0) + points;
  await user.save();
};

/**
 * @desc Submit a review
 * @route POST /api/reviews
 * @access Private
 */
export const submitReview = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { userId, rating, content } = req.body;
    const reviewerId = req.user?.id;

    if (rating < 1 || rating > 5) {
      sendResponse(res, 400, false, "Rating must be between 1 and 5");
      return;
    }

    if (!content || content.trim() === "") {
      sendResponse(res, 400, false, "Review content cannot be empty");
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    if (userId === reviewerId) {
      sendResponse(res, 400, false, "You cannot review yourself");
      return;
    }

    const existingReview = await Review.findOne({
      reviewer: reviewerId,
      reviewee: userId,
    });
    if (existingReview) {
      sendResponse(res, 400, false, "You have already submitted a review for this user");
      return;
    }

    const newReview = await Review.create({
      reviewer: reviewerId,
      reviewee: userId,
      rating,
      content,
    });

    sendResponse(res, 201, true, "Review submitted successfully", { review: newReview });
  }
);
