import mongoose from "mongoose";
import type { Request, Response, NextFunction } from "express";
import FeedPost from "../models/FeedPost";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { logger } from "../../utils/winstonLogger";
import Feedback from "@src/api/models/Feedback";
import { RequestWithUser } from "../types/RequestWithUser";

// Define reusable request types
type CreatePostBody = {
  goalId: string;
  milestone?: string;
  message: string;
};

type AddCommentBody = {
  text: string;
};

type SubmitFeedbackBody = {
  message: string; // The feedback message from the user
  type: string; // The type of feedback (e.g., bug report, suggestion)
};

/**
 * @desc    Create a new milestone post
 * @route   POST /api/feed
 * @access  Private
 */
export const createPost = catchAsync(
  async (
    req: Request<{}, {}, CreatePostBody> & RequestWithUser,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { goalId, milestone, message } = req.body;
    const userId = req.user.id; // Now it's guaranteed that user is available

    if (!message || typeof message !== "string" || message.trim() === "") {
      sendResponse(res, 400, false, "Post message cannot be empty");
      return;
    }

    const newPost = await FeedPost.create({
      user: new mongoose.Types.ObjectId(userId),
      goal: goalId,
      milestone,
      message,
      likes: [],
      comments: [],
    });

    logger.info(`Milestone post created by user: ${userId}`);
    sendResponse(res, 201, true, "Milestone shared successfully", {
      post: newPost,
    });
  },
);

/**
 * @desc    Get all posts for the feed
 * @route   GET /api/feed
 * @access  Private
 */
export const getFeed = catchAsync(
  async (_req: Request & RequestWithUser, res: Response, _next: NextFunction): Promise<void> => {
    // Retrieve posts sorted by creation time descending
    const posts = await FeedPost.find({}).sort({ createdAt: -1 });
    sendResponse(res, 200, true, "Feed fetched successfully", { posts });
  },
);

/**
 * @desc    Add a like to a post
 * @route   POST /api/feed/:id/like
 * @access  Private
 */
export const addLike = catchAsync(
  async (
    req: Request<{ id: string }> & RequestWithUser,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { id: postId } = req.params;
    const userId = req.user.id; // Now it's guaranteed that user is available

    const post = await FeedPost.findById(postId);
    if (!post) {
      sendResponse(res, 404, false, "Post not found");
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (post.likes.some((likeId) => likeId.equals(userObjectId))) {
      sendResponse(res, 400, false, "You have already liked this post");
      return;
    }

    post.likes.push(userObjectId);
    await post.save();

    logger.info(`Post liked by user: ${userId}`);
    sendResponse(res, 200, true, "Post liked successfully", { post });
  },
);

/**
 * @desc    Remove a like from a post
 * @route   DELETE /api/feed/:id/unlike
 * @access  Private
 */
export const removeLike = catchAsync(
  async (
    req: Request<{ id: string }> & RequestWithUser,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { id: postId } = req.params;
    const userId = req.user.id; // Now it's guaranteed that user is available

    const post = await FeedPost.findById(postId);
    if (!post) {
      sendResponse(res, 404, false, "Post not found");
      return;
    }

    // Remove the user's like from the array
    post.likes = post.likes.filter((likeId) => likeId.toString() !== userId);
    await post.save();

    logger.info(`Like removed by user: ${userId} from post: ${postId}`);
    sendResponse(res, 200, true, "Like removed successfully", { post });
  },
);

/**
 * @desc    Add a comment to a post
 * @route   POST /api/feed/:id/comment
 * @access  Private
 */
export const addComment = catchAsync(
  async (
    req: Request<{ id: string }, {}, AddCommentBody> & RequestWithUser,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { id: postId } = req.params;
    const { text } = req.body;
    const userId = req.user.id; // Now it's guaranteed that user is available

    if (!text || typeof text !== "string" || text.trim() === "") {
      sendResponse(res, 400, false, "Comment cannot be empty");
      return;
    }

    const post = await FeedPost.findById(postId);
    if (!post) {
      sendResponse(res, 404, false, "Post not found");
      return;
    }

    post.comments.push({
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(userId),
      text,
    });
    await post.save();

    logger.info(`Comment added by user: ${userId} to post: ${postId}`);
    sendResponse(res, 201, true, "Comment added successfully", { post });
  },
);

/**
 * @desc    Remove a comment from a post
 * @route   DELETE /api/feed/:postId/comment/:commentId
 * @access  Private
 */
export const removeComment = catchAsync(
  async (
    req: Request<{ postId: string; commentId: string }> & RequestWithUser,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { postId, commentId } = req.params;
    const userId = req.user.id; // Now it's guaranteed that user is available

    const post = await FeedPost.findById(postId);
    if (!post) {
      sendResponse(res, 404, false, "Post not found");
      return;
    }

    const commentIndex = post.comments.findIndex(
      (comment) => comment._id.toString() === commentId,
    );

    if (commentIndex === -1) {
      sendResponse(res, 404, false, "Comment not found");
      return;
    }

    const comment = post.comments[commentIndex];
    const isAdmin = req.user.isAdmin || false;

    // Allow removal if the comment owner, the post owner, or an admin
    if (comment.user.toString() !== userId && post.user.toString() !== userId && !isAdmin) {
      sendResponse(res, 403, false, "Unauthorized action");
      return;
    }

    post.comments.splice(commentIndex, 1);
    await post.save();

    logger.info(`Comment removed by user: ${userId} from post: ${postId}`);
    sendResponse(res, 200, true, "Comment removed successfully", { post });
  },
);

/**
 * @desc    Get feedback submitted by the authenticated user
 * @route   GET /api/feedback
 * @access  Private
 */
export const getUserFeedback = catchAsync(
  async (req: RequestWithUser, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user.id;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    const feedback = await Feedback.find({ user: userId }).sort({ createdAt: -1 });
    logger.info(`Feedback retrieved for user: ${userId}`);
    sendResponse(res, 200, true, "User feedback retrieved successfully", { feedback });
  },
);

/**
 * @desc    Delete feedback by ID
 * @route   DELETE /api/feedback/:feedbackId
 * @access  Private
 */
export const deleteFeedback = catchAsync(
  async (
    req: Request<{ feedbackId: string }> & RequestWithUser,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { feedbackId } = req.params;
    const userId = req.user.id;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    const feedback = await Feedback.findOne({ _id: feedbackId, user: userId });
    if (!feedback) {
      sendResponse(res, 404, false, "Feedback not found or access denied");
      return;
    }

    await feedback.deleteOne();

    logger.info(`Feedback deleted by user: ${userId}, feedback ID: ${feedbackId}`);
    sendResponse(res, 200, true, "Feedback deleted successfully");
  },
);

/**
 * @desc    Submit feedback
 * @route   POST /api/feedback
 * @access  Private
 */
export const submitFeedback = catchAsync(
  async (
    req: Request<{}, {}, SubmitFeedbackBody> & RequestWithUser,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { message, type } = req.body;
    const userId = req.user.id;

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    logger.info(`Feedback submitted by user: ${userId}`);
    sendResponse(res, 201, true, "Feedback submitted successfully", {
      message,
      type,
    });
  },
);

// Default export for functions used in feed routes
export default {
  createPost,
  getFeed,
  addLike,
  removeLike,
  addComment,
  removeComment,
  // Additional functions can be exported as needed
};
