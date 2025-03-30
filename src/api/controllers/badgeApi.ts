import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import Badge from "../models/Badge"; // Ensure the correct path for your Badge model

/**
 * @desc Create a new badge
 * @route POST /api/badges
 * @access Private (Admin only)
 */
export const createBadge = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userId, badgeType, level, progress, goal, pointsRewarded, description } = req.body;

  // Validate the input
  if (!userId || !badgeType || !level || !progress || !goal || pointsRewarded == null) {
    sendResponse(res, 400, false, "User ID, badge type, level, progress, goal, and points are required");
    return;
  }

  // Create a new badge
  const newBadge = await Badge.create({
    user: userId,
    badgeType,
    level,
    progress,
    goal,
    pointsRewarded,
    description,
    dateAwarded: new Date(),
    isShowcased: false, // Default to false, can be updated later
  });

  sendResponse(res, 201, true, "Badge created successfully", { badge: newBadge });
});

/**
 * @desc Get all badges (for admin view)
 * @route GET /api/badges
 * @access Private (Admin only)
 */
export const getAllBadges = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  // Fetch all badges from the database
  const badges = await Badge.find().sort({ dateAwarded: -1 }); // Sort by date, descending (latest first)

  if (!badges || badges.length === 0) {
    sendResponse(res, 404, false, "No badges found");
    return;
  }

  sendResponse(res, 200, true, "Badges fetched successfully", { badges });
});

/**
 * @desc Update an existing badge
 * @route PUT /api/badges/:id
 * @access Private (Admin only)
 */
export const updateBadge = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { badgeType, level, progress, goal, pointsRewarded, description, isShowcased } = req.body;

  // Check if the badge exists
  const badge = await Badge.findById(id);
  if (!badge) {
    sendResponse(res, 404, false, "Badge not found");
    return;
  }

  // Update the badge fields
  badge.badgeType = badgeType || badge.badgeType;
  badge.level = level || badge.level;
  badge.progress = progress || badge.progress;
  badge.goal = goal || badge.goal;
  badge.pointsRewarded = pointsRewarded || badge.pointsRewarded;
  badge.description = description || badge.description;
  badge.isShowcased = isShowcased ?? badge.isShowcased; // Only update if provided

  // Save the updated badge
  await badge.save();

  sendResponse(res, 200, true, "Badge updated successfully", { badge });
});

/**
 * @desc Delete a badge
 * @route DELETE /api/badges/:id
 * @access Private (Admin only)
 */
export const deleteBadge = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  // Check if the badge exists
  const badge = await Badge.findById(id);
  if (!badge) {
    sendResponse(res, 404, false, "Badge not found");
    return;
  }
  
  // Delete the badge using deleteOne
  await Badge.deleteOne({ _id: id });
  
  sendResponse(res, 200, true, "Badge deleted successfully");
});
  

export default {
  createBadge,
  getAllBadges,
  updateBadge,
  deleteBadge,
};
