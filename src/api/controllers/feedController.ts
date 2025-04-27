// src/api/controllers/feedController.ts
import type { Request, Response } from "express";
import mongoose from "mongoose";
import FeedPost from "../models/FeedPost";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

/**
 * GET /api/feed
 * Fetch all feed posts
 */
export const getFeed = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const posts = await FeedPost.find()
      .sort({ createdAt: -1 })
      .populate("user", "username")
      .populate("comments.user", "username");
    sendResponse(res, 200, true, "Feed posts retrieved successfully", { posts });
  }
);

/**
 * POST /api/feed/post
 * Create a new feed post
 */
export const createPost = catchAsync(
  async (
    req: Request<{}, {}, { goalId: string; milestone: string; message?: string }>,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { goalId, milestone, message } = req.body;

    const newPost = await FeedPost.create({
      user: new mongoose.Types.ObjectId(userId),
      goal: goalId,
      milestone,
      message: message?.trim() || "",
      likes: [],
      comments: [],
      createdAt: new Date(),
    });

    sendResponse(res, 201, true, "Post created successfully", { post: newPost });
  }
);

/**
 * POST /api/feed/like/:id
 * Like a post
 */
export const addLike = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const postId = req.params.id;

    const post = await FeedPost.findById(postId);
    if (!post) {
      sendResponse(res, 404, false, "Post not found");
      return;
    }

    const objId = new mongoose.Types.ObjectId(userId);
    if (post.likes.some(l => l.equals(objId))) {
      sendResponse(res, 400, false, "Already liked");
      return;
    }

    post.likes.push(objId);
    await post.save();

    sendResponse(res, 200, true, "Post liked", { post });
  }
);

/**
 * DELETE /api/feed/unlike/:id
 * Unlike a post
 */
export const removeLike = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const postId = req.params.id;

    const post = await FeedPost.findById(postId);
    if (!post) {
      sendResponse(res, 404, false, "Post not found");
      return;
    }

    post.likes = post.likes.filter(l => l.toString() !== userId);
    await post.save();

    sendResponse(res, 200, true, "Like removed", { post });
  }
);

/**
 * POST /api/feed/comment/:id
 * Add a comment
 */
export const addComment = catchAsync(
  async (
    req: Request<{ id: string }, {}, { text: string }>,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const postId = req.params.id;
    const { text } = req.body;

    const post = await FeedPost.findById(postId);
    if (!post) {
      sendResponse(res, 404, false, "Post not found");
      return;
    }

    post.comments.push({
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(userId),
      text: text.trim(),
      createdAt: new Date(),
    });
    await post.save();

    sendResponse(res, 200, true, "Comment added", { post });
  }
);

/**
 * DELETE /api/feed/comment/:postId/:commentId
 * Remove a comment
 */
export const removeComment = catchAsync(
  async (
    req: Request<{ postId: string; commentId: string }>,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { postId, commentId } = req.params;

    const post = await FeedPost.findById(postId);
    if (!post) {
      sendResponse(res, 404, false, "Post not found");
      return;
    }

    const idx = post.comments.findIndex(c => c._id.toString() === commentId);
    if (idx === -1) {
      sendResponse(res, 404, false, "Comment not found");
      return;
    }

    const comment = post.comments[idx];
    // only author of comment or post owner can delete
    if (
      comment.user.toString() !== userId &&
      post.user.toString() !== userId
    ) {
      sendResponse(res, 403, false, "Unauthorized to delete this comment");
      return;
    }

    post.comments.splice(idx, 1);
    await post.save();

    sendResponse(res, 200, true, "Comment removed", { post });
  }
);
