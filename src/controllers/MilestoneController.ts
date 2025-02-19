import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Milestone from "../models/Milestone"; // Ensure a corresponding Milestone model exists
import catchAsync from "../utils/catchAsync"; // Catch async errors
import sendResponse from "../utils/sendResponse"; // Unified response format


/**
 * @desc Get all milestones for a user
 * @route GET /api/milestones
 * @access Private
 */
export const getUserMilestones = catchAsync(
  async (
    req: Request<{}, {}, {}, {}>, // Explicitly define generic type
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = (req as any).user?.id; // Explicitly cast req for user property

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    const milestones = await Milestone.find({ user: userId }).sort({ createdAt: -1 });
    sendResponse(res, 200, true, "Milestones fetched successfully", { milestones });
  },
);

/**
 * @desc Add a new milestone
 * @route POST /api/milestones/add
 * @access Private
 */
export const addMilestone = catchAsync(
  async (
    req: Request<{}, {}, { title: string; description?: string; dueDate: string }>, // Added body type
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = (req as any).user?.id;
    const { title, description, dueDate } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    if (!title || !dueDate) {
      sendResponse(res, 400, false, "Title and due date are required");
      return;
    }

    const newMilestone = new Milestone({
      user: userId,
      title,
      description,
      dueDate,
    });

    const savedMilestone = await newMilestone.save();
    sendResponse(res, 201, true, "Milestone added successfully", { milestone: savedMilestone });
  },
);

/**
 * @desc Update a milestone
 * @route PUT /api/milestones/update
 * @access Private
 */
export const updateMilestone = catchAsync(
  async (
    req: Request<{}, {}, { milestoneId: string; updates: Record<string, any> }>, // Added body type
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = (req as any).user?.id;
    const { milestoneId, updates } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(milestoneId)) {
      sendResponse(res, 400, false, "Invalid milestone ID");
      return;
    }

    const milestone = await Milestone.findOneAndUpdate(
      { _id: milestoneId, user: userId },
      { $set: updates },
      { new: true },
    );

    if (!milestone) {
      sendResponse(res, 404, false, "Milestone not found");
      return;
    }

    sendResponse(res, 200, true, "Milestone updated successfully", { milestone });
  },
);

/**
 * @desc Delete a milestone
 * @route DELETE /api/milestones/delete
 * @access Private
 */
export const deleteMilestone = catchAsync(
  async (
    req: Request<{}, {}, { milestoneId: string }>, // Added body type
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const userId = (req as any).user?.id;
    const { milestoneId } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(milestoneId)) {
      sendResponse(res, 400, false, "Invalid milestone ID");
      return;
    }

    const deletedMilestone = await Milestone.findOneAndDelete({
      _id: milestoneId,
      user: userId,
    });

    if (!deletedMilestone) {
      sendResponse(res, 404, false, "Milestone not found");
      return;
    }

    sendResponse(res, 200, true, "Milestone deleted successfully");
  },
);
