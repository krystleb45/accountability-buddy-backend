import type { Request, Response } from "express"; // Ensure Request is imported from express
import mongoose from "mongoose";
import User from "../models/User";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import bcrypt from "bcryptjs";

/**
 * ✅ @desc Get user profile
 * ✅ @route GET /api/user/profile
 * ✅ @access Private
 */
export const getUserProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }

  const userId = req.user.id;
  const user = await User.findById(userId).select("-password");

  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }

  sendResponse(res, 200, true, "User profile fetched successfully.", { user });
});

/**
 * ✅ @desc Update user profile
 * ✅ @route PUT /api/user/profile
 * ✅ @access Private
 */
export const updateUserProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }

  const userId = req.user.id;
  const updates = req.body;

  const updatedUser = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!updatedUser) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }

  sendResponse(res, 200, true, "User profile updated successfully.", { updatedUser });
});

/**
 * ✅ @desc Change user password
 * ✅ @route PATCH /api/user/password
 * ✅ @access Private
 */
export const changePassword = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }

  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(userId).select("+password");

  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    sendResponse(res, 400, false, "Current password is incorrect.");
    return;
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  sendResponse(res, 200, true, "Password updated successfully.");
});

/**
 * ✅ @desc Delete user account
 * ✅ @route DELETE /api/user/account
 * ✅ @access Private
 */
export const deleteUserAccount = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }

  const userId = req.user.id;
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }

  sendResponse(res, 200, true, "Account deleted successfully.");
});

/**
 * ✅ @desc Pin a goal for a user
 * ✅ @route POST /api/user/pin-goal
 * ✅ @access Private
 */
export const pinGoal = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }

  const userId = req.user.id;
  const { goalId } = req.body;

  if (!mongoose.isValidObjectId(goalId)) {
    sendResponse(res, 400, false, "Invalid Goal ID format.");
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }

  if (user.pinnedGoals.includes(goalId)) {
    sendResponse(res, 400, false, "Goal is already pinned.");
    return;
  }

  user.pinnedGoals.push(new mongoose.Types.ObjectId(goalId));
  await user.save();

  sendResponse(res, 200, true, "Goal pinned successfully.", { pinnedGoals: user.pinnedGoals });
});

/**
 * ✅ @desc Unpin a goal for a user
 * ✅ @route DELETE /api/user/unpin-goal
 * ✅ @access Private
 */
export const unpinGoal = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }

  const userId = req.user.id;
  const { goalId } = req.body;

  if (!mongoose.isValidObjectId(goalId)) {
    sendResponse(res, 400, false, "Invalid Goal ID format.");
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }

  user.pinnedGoals = user.pinnedGoals.filter(
    (id) => id.toString() !== goalId.toString()
  );

  await user.save();

  sendResponse(res, 200, true, "Goal unpinned successfully.", { pinnedGoals: user.pinnedGoals });
});

/**
 * ✅ @desc Get all pinned goals for a user
 * ✅ @route GET /api/user/pinned-goals
 * ✅ @access Private
 */
export const getPinnedGoals = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }

  const userId = req.user.id;
  const user = await User.findById(userId).populate("pinnedGoals");

  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }

  sendResponse(res, 200, true, "Pinned goals retrieved successfully.", { pinnedGoals: user.pinnedGoals });
});

/**
 * ✅ @desc Get all featured achievements for a user
 * ✅ @route GET /api/user/featured-achievements
 * ✅ @access Private
 */
export const getFeaturedAchievements = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized request.");
    return;
  }

  const userId = req.user.id;
  const user = await User.findById(userId).populate("featuredAchievements");

  if (!user) {
    sendResponse(res, 404, false, "User not found.");
    return;
  }

  sendResponse(res, 200, true, "Featured achievements retrieved successfully.", { featuredAchievements: user.featuredAchievements });
});
