// src/api/controllers/feedController.ts
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import FeedService from "../services/FeedService";

/** GET /api/feed — fetch all feed posts */
export const getFeed = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const posts = await FeedService.getFeed();
  sendResponse(res, 200, true, "Feed posts retrieved successfully", { posts });
});

/** POST /api/feed/post — create a new feed post */
export const createPost = catchAsync(async (
  req: Request<{}, {}, { goalId: string; milestone: string; message?: string }>,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const { goalId, milestone, message } = req.body;

  const post = await FeedService.createPost(userId, goalId, milestone, message);
  sendResponse(res, 201, true, "Post created successfully", { post });
});

/** POST /api/feed/like/:id — like a post */
export const addLike = catchAsync(async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const postId = req.params.id;

  const post = await FeedService.addLike(userId, postId);
  sendResponse(res, 200, true, "Post liked", { post });
});

/** DELETE /api/feed/unlike/:id — unlike a post */
export const removeLike = catchAsync(async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const postId = req.params.id;

  const post = await FeedService.removeLike(userId, postId);
  sendResponse(res, 200, true, "Like removed", { post });
});

/** POST /api/feed/comment/:id — add a comment */
export const addComment = catchAsync(async (
  req: Request<{ id: string }, {}, { text: string }>,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const postId = req.params.id;
  const { text } = req.body;

  const post = await FeedService.addComment(userId, postId, text);
  sendResponse(res, 200, true, "Comment added", { post });
});

/** DELETE /api/feed/comment/:postId/:commentId — remove a comment */
export const removeComment = catchAsync(async (
  req: Request<{ postId: string; commentId: string }>,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;
  const { postId, commentId } = req.params;

  const post = await FeedService.removeComment(userId, postId, commentId);
  sendResponse(res, 200, true, "Comment removed", { post });
});

export default {
  getFeed,
  createPost,
  addLike,
  removeLike,
  addComment,
  removeComment,
};
