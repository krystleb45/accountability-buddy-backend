// src/api/services/FeedbackService.ts

import { Types } from "mongoose";
import Feedback, { IFeedback, FeedbackType, FeedbackStatus, FeedbackPriority } from "../models/Feedback";
import { createError } from "../middleware/errorHandler";
import LoggingService from "./LoggingService";

export default class FeedbackService {
  /**
   * Create a new feedback entry for a user.
   *
   * @param userId   - the authenticated user’s ID (string)
   * @param message  - the feedback message text
   * @param type     - one of "bug" | "feature-request" | "other"
   * @param isAnonymous - optional, defaults to false
   * @param relatedFeature - optional, a string if user ties feedback to a feature
   */
  static async submitFeedback(
    userId: string,
    message: string,
    type: FeedbackType,
    isAnonymous: boolean = false,
    relatedFeature?: string
  ): Promise<IFeedback> {
    // 1) Validate userId is a valid ObjectId
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }

    // 2) Ensure message and type are non‐empty
    if (!message.trim()) {
      throw createError("Feedback message is required", 400);
    }
    if (!type.trim() || !["bug", "feature-request", "other"].includes(type)) {
      throw createError("Invalid feedback type", 400);
    }

    // 3) Build the new Feedback document using the correct field name: `userId`
    const newFeedback = new Feedback({
      userId:         new Types.ObjectId(userId),
      message:        message.trim(),
      type:           type.trim() as FeedbackType,
      status:         "pending" as FeedbackStatus,     // default
      priority:       "medium" as FeedbackPriority,    // default
      isAnonymous:    isAnonymous,
      relatedFeature: relatedFeature?.trim(),
      // createdAt / updatedAt are handled automatically by `timestamps: true`
    });

    // 4) Save to MongoDB
    const saved = await newFeedback.save();

    // 5) Log an informational message (optional)
    await LoggingService.logInfo(
      `Feedback submitted by user ${userId}`,
      { feedbackId: saved._id.toString(), type }
    );

    return saved;
  }

  /**
   * Retrieve all feedback entries for a given user, sorted by newest first.
   *
   * @param userId - the authenticated user’s ID (string)
   */
  static async getUserFeedback(userId: string): Promise<IFeedback[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }

    const feedbackList = await Feedback.find({ userId: userId })
      .sort({ createdAt: -1 })
      .lean();

    await LoggingService.logInfo(
      `Fetched ${feedbackList.length} feedback items for user ${userId}`
    );

    return feedbackList;
  }

  /**
   * Delete a single feedback entry if it belongs to the user.
   *
   * @param userId     - the authenticated user’s ID (string)
   * @param feedbackId - the ID of the feedback document (string)
   */
  static async deleteFeedback(userId: string, feedbackId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(feedbackId)) {
      throw createError("Invalid ID format", 400);
    }

    // Verify that this feedback exists and belongs to the user
    const existing = await Feedback.findOne({ _id: feedbackId, userId: userId });
    if (!existing) {
      throw createError("Feedback not found or access denied", 404);
    }

    await existing.deleteOne();
    await LoggingService.logInfo(
      `Feedback ${feedbackId} deleted by user ${userId}`
    );
  }
}
