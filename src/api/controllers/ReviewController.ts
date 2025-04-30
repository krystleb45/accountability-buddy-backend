// src/api/controllers/ReviewController.ts

import type { Request, Response, NextFunction } from "express";
import ReviewService from "../services/ReviewService";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

/**
 * @desc    Submit a new review
 * @route   POST /api/reviews
 * @access  Private
 */
export const submitReview = catchAsync(
  async (
    req: Request<{}, {}, { userId: string; rating: number; content: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const { userId, rating, content } = req.body;
    const reviewerId = req.user!.id;

    if (rating < 1 || rating > 5) {
      sendResponse(res, 400, false, "Rating must be between 1 and 5");
      return;
    }

    if (!content.trim()) {
      sendResponse(res, 400, false, "Review content cannot be empty");
      return;
    }

    const review = await ReviewService.createReview(
      reviewerId,
      userId,
      rating,
      content
    );
    sendResponse(res, 201, true, "Review submitted successfully", { review });
  }
);

/**
 * @desc    Get all reviews for a given user
 * @route   GET /api/reviews/:userId
 * @access  Public
 */
export const getUserReviews = catchAsync(
  async (
    req: Request<{ userId: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const { userId } = req.params;
    const reviews = await ReviewService.listReviewsForUser(userId);
    sendResponse(res, 200, true, "User reviews fetched successfully", { reviews });
  }
);

/**
 * @desc    Delete a review (only by its author)
 * @route   DELETE /api/reviews/:reviewId
 * @access  Private
 */
export const deleteReview = catchAsync(
  async (
    req: Request<{ reviewId: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const { reviewId } = req.params;
    const reviewerId = req.user!.id;

    await ReviewService.deleteReview(reviewId, reviewerId);
    sendResponse(res, 200, true, "Review deleted successfully");
  }
);

export default {
  submitReview,
  getUserReviews,
  deleteReview,
};
