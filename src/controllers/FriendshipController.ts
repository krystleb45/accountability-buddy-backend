import mongoose from "mongoose";
import type { Request, Response } from "express";
import type { IFeedPost } from "../models/FeedPost";
import FeedPost from "../models/FeedPost";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import logger from "../utils/winstonLogger";

/**
 * @desc    Create a new milestone post
 * @route   POST /api/feed
 * @access  Private
 */
export const createPost = catchAsync(
  async (
    req: Request<{}, any, { goalId: string; milestone: string; message: string }>,
    res: Response,
  ): Promise<void> => {
    const { goalId, milestone, message } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

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
 * @desc    Add a like to a post
 * @route   POST /api/feed/:id/like
 * @access  Private
 */
export const addLike = catchAsync(
  async (
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<void> => {
    const postId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    const post = (await FeedPost.findById(postId)) as IFeedPost | null;
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
 * @desc    Add a comment to a post
 * @route   POST /api/feed/:id/comment
 * @access  Private
 */
export const addComment = catchAsync(
  async (
    req: Request<{ id: string }, any, { text: string }>,
    res: Response,
  ): Promise<void> => {
    const postId = req.params.id;
    const { text } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    if (!text || typeof text !== "string" || text.trim() === "") {
      sendResponse(res, 400, false, "Comment cannot be empty");
      return;
    }

    const post = (await FeedPost.findById(postId)) as IFeedPost | null;
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
    req: Request<{ postId: string; commentId: string }>,
    res: Response,
  ): Promise<void> => {
    const { postId, commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    const post = (await FeedPost.findById(postId)) as IFeedPost | null;
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
    // Ensure user is either admin or the owner of the comment or the post
    if (comment.user.toString() !== userId && post.user.toString() !== userId) {
      sendResponse(res, 403, false, "Unauthorized action");
      return;
    }

    post.comments.splice(commentIndex, 1);
    await post.save();

    logger.info(`Comment removed by user: ${userId} from post: ${postId}`);
    sendResponse(res, 200, true, "Comment removed successfully", { post });
  },
);

export default {
  createPost,
  addLike,
  addComment,
  removeComment,
};
