import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import XpHistory from "../models/XpHistory"; // Corrected import

/**
 * @desc Fetch XP history for a user
 * @route GET /api/xp-history/:userId
 * @access Private
 */
export const getXpHistory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  // Fetch XP history for the user
  const xpHistory = await XpHistory.find({ userId }).sort({ date: -1 }); // Sort by date, descending (latest first)

  if (!xpHistory || xpHistory.length === 0) {
    sendResponse(res, 404, false, "No XP history found for this user.");
    return;
  }

  sendResponse(res, 200, true, "XP history fetched successfully", { xpHistory });
});

/**
 * @desc Create a new XP history entry
 * @route POST /api/xp-history
 * @access Private
 */
export const createXpHistory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userId, xp, date } = req.body;

  // Validate the input
  if (!userId || xp == null || !date) {
    sendResponse(res, 400, false, "User ID, XP, and date are required.");
    return;
  }

  // Create a new XP history entry
  const newXpHistory = await XpHistory.create({
    userId,
    xp,
    date,
  });

  sendResponse(res, 201, true, "XP history created successfully", { xpHistory: newXpHistory });
});

/**
 * @desc Delete an XP history entry
 * @route DELETE /api/xp-history/:id
 * @access Private
 */
export const deleteXpHistory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  // Check if the XP history entry exists
  const xpHistory = await XpHistory.findById(id);
  if (!xpHistory) {
    sendResponse(res, 404, false, "XP history entry not found.");
    return;
  }
  
  // Delete the XP history entry
  await XpHistory.deleteOne({ _id: id }); // Use deleteOne instead of remove
  
  sendResponse(res, 200, true, "XP history entry deleted successfully");
});
  

export default {
  getXpHistory,
  createXpHistory,
  deleteXpHistory,
};
