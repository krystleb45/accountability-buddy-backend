// src/api/controllers/FeedbackController.ts
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import FeedbackService from "../services/FeedbackService";
import { createError } from "../middleware/errorHandler";

/**
 * @desc    Submit user feedback
 * @route   POST /api/feedback
 * @access  Private
 */
export const submitFeedback = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      // no need to return manually here since catchAsync will catch the thrown error
      throw createError("Unauthorized", 401);
    }

    const { message, type } = req.body as { message: string; type: string };

    // delegate to service
    const feedback = await FeedbackService.submitFeedback(userId, message, type);

    sendResponse(res, 201, true, "Feedback submitted successfully", {
      feedback,
    });
  }
);

/**
 * @desc    Get feedback submitted by the authenticated user
 * @route   GET /api/feedback
 * @access  Private
 */
export const getUserFeedback = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) throw createError("Unauthorized", 401);

    const list = await FeedbackService.getUserFeedback(userId);
    sendResponse(res, 200, true, "User feedback retrieved successfully", {
      feedback: list,
    });
  }
);

/**
 * @desc    Delete feedback by ID
 * @route   DELETE /api/feedback/:feedbackId
 * @access  Private
 */
export const deleteFeedback = catchAsync(
  async (req: Request<{ feedbackId: string }>, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) throw createError("Unauthorized", 401);

    const { feedbackId } = req.params;
    await FeedbackService.deleteFeedback(userId, feedbackId);
    sendResponse(res, 200, true, "Feedback deleted successfully");
  }
);

export default {
  submitFeedback,
  getUserFeedback,
  deleteFeedback,
};
