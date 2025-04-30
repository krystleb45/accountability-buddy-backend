// src/api/services/FeedbackService.ts
import { Types } from "mongoose";
import Feedback, { IFeedback } from "../models/Feedback";
import { createError } from "../middleware/errorHandler";
import LoggingService from "./LoggingService";

class FeedbackService {
  /**
   * Create a new feedback entry for a user.
   */
  static async submitFeedback(
    userId: string,
    message: string,
    type: string
  ): Promise<IFeedback> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    if (!message.trim() || !type.trim()) {
      throw createError("Both message and type are required", 400);
    }

    const feedback = await Feedback.create({
      user: new Types.ObjectId(userId),
      message: message.trim(),
      type: type.trim(),
      createdAt: new Date(),
    });

    await LoggingService.logInfo(
      `Feedback submitted by ${userId}: ${feedback._id}`,
      { type }
    );
    return feedback;
  }

  /**
   * Retrieve all feedback entries for a given user.
   */
  static async getUserFeedback(userId: string): Promise<IFeedback[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    const list = await Feedback.find({ user: userId }).sort({ createdAt: -1 });
    await LoggingService.logInfo(
      `Fetched ${list.length} feedback items for user ${userId}`
    );
    return list;
  }

  /**
   * Delete a single feedback entry if it belongs to the user.
   */
  static async deleteFeedback(userId: string, feedbackId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(feedbackId)) {
      throw createError("Invalid ID format", 400);
    }

    const fb = await Feedback.findOne({ _id: feedbackId, user: userId });
    if (!fb) {
      throw createError("Feedback not found or access denied", 404);
    }

    await fb.deleteOne();
    await LoggingService.logInfo(
      `Feedback ${feedbackId} deleted by user ${userId}`
    );
  }
}

export default FeedbackService;
