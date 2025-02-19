import type { Request, Response } from "express";
import User from "../models/User";
import Review from "../models/Review"; // Assuming Review model exists
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

/**
 * @desc Submit a review
 * @route POST /api/reviews
 * @access Private
 */
export const submitReview = catchAsync(
  async (
    req: Request<{}, any, { userId: string; rating: number; content: string }>,
    res: Response,
  ): Promise<void> => {
    const { userId, rating, content } = req.body;
    const reviewerId = req.user?.id;

    // Validate rating
    if (rating < 1 || rating > 5) {
      sendResponse(res, 400, false, "Rating must be between 1 and 5");
      return;
    }

    // Validate content
    if (!content || content.trim() === "") {
      sendResponse(res, 400, false, "Review content cannot be empty");
      return;
    }

    // Validate user existence
    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    // Prevent self-reviews
    if (userId === reviewerId) {
      sendResponse(res, 400, false, "You cannot review yourself");
      return;
    }

    // Check for existing review
    const existingReview = await Review.findOne({
      reviewer: reviewerId,
      reviewee: userId,
    });
    if (existingReview) {
      sendResponse(res, 400, false, "You have already submitted a review for this user");
      return;
    }

    // Create new review
    const newReview = await Review.create({
      reviewer: reviewerId,
      reviewee: userId,
      rating,
      content,
    });

    sendResponse(res, 201, true, "Review submitted successfully", {
      review: newReview,
    });
  },
);

/**
 * @desc Get reviews for a user
 * @route GET /api/reviews/:userId
 * @access Public
 */
export const getUserReviews = catchAsync(
  async (
    req: Request<{ userId: string }>,
    res: Response,
  ): Promise<void> => {
    const { userId } = req.params;

    // Validate user existence
    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }

    // Fetch reviews for the user
    const reviews = await Review.find({ reviewee: userId }).populate(
      "reviewer",
      "username profilePicture",
    );

    sendResponse(res, 200, true, "User reviews fetched successfully", { reviews });
  },
);

/**
 * @desc Delete a review
 * @route DELETE /api/reviews/:reviewId
 * @access Private
 */
export const deleteReview = catchAsync(
  async (
    req: Request<{ reviewId: string }>,
    res: Response,
  ): Promise<void> => {
    const { reviewId } = req.params;
    const reviewerId = req.user?.id;

    // Find and delete the review
    const review = await Review.findOneAndDelete({
      _id: reviewId,
      reviewer: reviewerId,
    });

    if (!review) {
      sendResponse(res, 404, false, "Review not found or access denied");
      return;
    }

    sendResponse(res, 200, true, "Review deleted successfully");
  },
);
