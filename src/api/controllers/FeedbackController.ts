// src/api/controllers/FeedbackController.ts
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import Feedback from "../models/Feedback";

/**
 * @desc    Submit user feedback
 * @route   POST /api/feedback
 * @access  Private
 */
export const submitFeedback = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const { message, type } = req.body as { message: string; type: string };

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }
    if (!message?.trim() || !type) {
      sendResponse(res, 400, false, "Both message and type are required");
      return;
    }

    const newFeedback = await Feedback.create({
      user: new mongoose.Types.ObjectId(userId),
      message: message.trim(),
      type,
      createdAt: new Date(),
    });

    sendResponse(res, 201, true, "Feedback submitted successfully", {
      feedback: newFeedback,
    });
  }
);

/**
 * @desc    Get feedback submitted by the authenticated user
 * @route   GET /api/feedback
 * @access  Private
 */
export const getUserFeedback = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    const feedbackList = await Feedback.find({ user: userId })
      .sort({ createdAt: -1 });

    sendResponse(res, 200, true, "User feedback retrieved successfully", {
      feedback: feedbackList,
    });
  }
);

/**
 * @desc    Delete feedback by ID
 * @route   DELETE /api/feedback/:feedbackId
 * @access  Private
 */
export const deleteFeedback = catchAsync(
  async (req: Request<{ feedbackId: string }>, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const { feedbackId } = req.params;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }
    if (!feedbackId.match(/^[0-9a-fA-F]{24}$/)) {
      sendResponse(res, 400, false, "Invalid feedback ID");
      return;
    }

    const feedback = await Feedback.findOne({
      _id: feedbackId,
      user: userId
    });
    if (!feedback) {
      sendResponse(res, 404, false, "Feedback not found or access denied");
      return;
    }

    await feedback.deleteOne();
    sendResponse(res, 200, true, "Feedback deleted successfully");
  }
);

export default {
  submitFeedback,
  getUserFeedback,
  deleteFeedback,
};
