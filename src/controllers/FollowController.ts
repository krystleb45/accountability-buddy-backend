import { Request, Response } from "express";
import Follow from "../models/Follow";
import catchAsync from "../api/utils/catchAsync";
import sendResponse from "../api/utils/sendResponse";
import { createError } from "../middleware/errorHandler";

/**
 * @desc    Follow a user
 * @route   POST /api/follow/:userId
 * @access  Private
 */
export const followUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const currentUserId = req.user?.id;

  if (userId === currentUserId) {
    throw createError("You cannot follow yourself.", 400);
  }

  const existingFollow = await Follow.findOne({
    follower: currentUserId,
    following: userId,
  });

  if (existingFollow) {
    throw createError("You are already following this user.", 400);
  }

  const follow = new Follow({ follower: currentUserId, following: userId });
  await follow.save();

  sendResponse(res, 201, true, "User followed successfully.", { follow });
});

/**
 * @desc    Unfollow a user
 * @route   DELETE /api/follow/:userId
 * @access  Private
 */
export const unfollowUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const currentUserId = req.user?.id;

  const follow = await Follow.findOneAndDelete({
    follower: currentUserId,
    following: userId,
  });

  if (!follow) {
    throw createError("You are not following this user.", 400);
  }

  sendResponse(res, 200, true, "User unfollowed successfully.");
});

/**
 * @desc    Get user's followers
 * @route   GET /api/follow/followers/:userId
 * @access  Public
 */
export const getFollowers = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const followers = await Follow.find({ following: userId })
    .populate("follower", "username profilePicture")
    .lean();

  sendResponse(res, 200, true, "Followers retrieved successfully.", { followers });
});

/**
 * @desc    Get user's following list
 * @route   GET /api/follow/following/:userId
 * @access  Public
 */
export const getFollowing = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const following = await Follow.find({ follower: userId })
    .populate("following", "username profilePicture")
    .lean();

  sendResponse(res, 200, true, "Following list retrieved successfully.", { following });
});

export default {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
};
