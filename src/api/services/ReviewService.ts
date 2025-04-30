// src/api/services/ReviewService.ts

import { Types } from "mongoose";
import Review, { IReview } from "../models/Review";
import { User } from "../models/User";
import { createError } from "../middleware/errorHandler";
import { logger } from "../../utils/winstonLogger";

class ReviewService {
  /**
   * Submit a new review.
   */
  static async createReview(
    reviewerId: string,
    revieweeId: string,
    rating: number,
    content: string
  ): Promise<IReview> {
    // Validate IDs
    if (!Types.ObjectId.isValid(reviewerId) || !Types.ObjectId.isValid(revieweeId)) {
      throw createError("Invalid user ID(s)", 400);
    }

    // Prevent self-review
    if (reviewerId === revieweeId) {
      throw createError("You cannot review yourself", 400);
    }

    // Ensure reviewee exists
    const user = await User.findById(revieweeId).exec();
    if (!user) {
      throw createError("User not found", 404);
    }

    // Check for existing review
    const existing = await Review.findOne({ reviewer: reviewerId, reviewee: revieweeId }).exec();
    if (existing) {
      throw createError("You have already submitted a review for this user", 400);
    }

    // Create and return
    const review = await Review.create({
      reviewer: reviewerId,
      reviewee: revieweeId,
      rating,
      content,
    });
    logger.info(`Review ${review._id} created by ${reviewerId} for ${revieweeId}`);
    return review;
  }

  /**
   * Fetch all reviews written *about* a given user.
   */
  static async listReviewsForUser(revieweeId: string): Promise<IReview[]> {
    if (!Types.ObjectId.isValid(revieweeId)) {
      throw createError("Invalid user ID", 400);
    }
    // Ensure user exists
    const user = await User.findById(revieweeId).exec();
    if (!user) {
      throw createError("User not found", 404);
    }

    const reviews = await Review.find({ reviewee: revieweeId })
      .populate("reviewer", "username profilePicture")
      .sort({ createdAt: -1 })
      .exec();

    logger.info(`Fetched ${reviews.length} reviews for user ${revieweeId}`);
    return reviews;
  }

  /**
   * Delete a review, but only if it was written by the given reviewer.
   */
  static async deleteReview(
    reviewId: string,
    reviewerId: string
  ): Promise<void> {
    if (!Types.ObjectId.isValid(reviewId) || !Types.ObjectId.isValid(reviewerId)) {
      throw createError("Invalid ID(s)", 400);
    }

    const result = await Review.findOneAndDelete({
      _id: reviewId,
      reviewer: reviewerId,
    }).exec();

    if (!result) {
      throw createError("Review not found or access denied", 404);
    }
    logger.info(`Review ${reviewId} deleted by ${reviewerId}`);
  }
}

export default ReviewService;
