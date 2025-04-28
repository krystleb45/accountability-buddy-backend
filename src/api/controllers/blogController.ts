// src/api/controllers/blogController.ts
import type { Request, Response } from "express";
import mongoose from "mongoose";
import * as blogService from "../services/blogService";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

//
// ─── Helpers ───────────────────────────────────────────────────────────────────
//
const validateObjectId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

/**
 * @desc Create a new blog post
 * @route POST /api/blog
 */
export const createBlogPost = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    const { title, content, category } = req.body;
    if (!title || !content || !category) {
      sendResponse(res, 400, false, "Title, content & category required");
      return;
    }

    const post = await blogService.createBlogPostService(
      req.user.id,
      title,
      content,
      category
    );
    sendResponse(res, 201, true, "Blog post created", { post });
  }
);

/**
 * @desc Toggle like / unlike on a blog post
 * @route POST /api/blog/:id/like
 */
export const toggleLikeBlogPost = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    if (!req.user) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    const { id } = req.params;
    if (!validateObjectId(id)) {
      sendResponse(res, 400, false, "Invalid post ID");
      return;
    }

    const post = await blogService.toggleLikeBlogPostService(req.user.id, id);
    const liked = post.likes.some((l) => l.equals(req.user!.id));
    sendResponse(res, 200, true, `Blog post ${liked ? "liked" : "unliked"}`, { post });
  }
);

/**
 * @desc Add a comment
 * @route POST /api/blog/:id/comment
 */
export const addComment = catchAsync(
  async (
    req: Request<{ id: string }, {}, { text: string }>,
    res: Response
  ): Promise<void> => {
    if (!req.user) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    const { id } = req.params;
    const { text } = req.body;
    if (!validateObjectId(id) || !text?.trim()) {
      sendResponse(res, 400, false, "Invalid ID or empty comment");
      return;
    }

    const post = await blogService.addCommentService(req.user.id, id, text.trim());
    sendResponse(res, 201, true, "Comment added", { post });
  }
);

/**
 * @desc Remove a comment
 * @route DELETE /api/blog/:postId/comment/:commentId
 */
export const removeComment = catchAsync(
  async (req: Request<{ postId: string; commentId: string }>, res: Response): Promise<void> => {
    if (!req.user) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    const { postId, commentId } = req.params;
    if (!validateObjectId(postId) || !validateObjectId(commentId)) {
      sendResponse(res, 400, false, "Invalid IDs");
      return;
    }

    const post = await blogService.removeCommentService(req.user.id, postId, commentId);
    sendResponse(res, 200, true, "Comment removed", { post });
  }
);

/**
 * @desc Get all blog posts
 * @route GET /api/blog
 */
export const getAllBlogPosts = catchAsync(
  async (
    req: Request<{}, {}, {}, { limit?: string; page?: string }>,
    res: Response
  ): Promise<void> => {
    const limit = parseInt(req.query.limit || "10", 10);
    const page = parseInt(req.query.page || "1", 10);
    const posts = await blogService.getAllBlogPostsService(limit, page);
    sendResponse(res, 200, true, "Blog posts retrieved", { posts });
  }
);

/**
 * @desc Get a single blog post by ID
 * @route GET /api/blog/:id
 */
export const getBlogPostById = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      sendResponse(res, 400, false, "Invalid post ID");
      return;
    }
    const post = await blogService.getBlogPostByIdService(id);
    sendResponse(res, 200, true, "Blog post retrieved", { post });
  }
);

/**
 * @desc Edit a blog post
 * @route PUT /api/blog/:id
 */
export const editBlogPost = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    if (!req.user) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    const { id } = req.params;
    const { title, content, category } = req.body;
    if (!validateObjectId(id)) {
      sendResponse(res, 400, false, "Invalid post ID");
      return;
    }

    const post = await blogService.updateBlogPostService(
      req.user.id,
      id,
      title,
      content,
      category
    );
    sendResponse(res, 200, true, "Blog post updated", { post });
  }
);

/**
 * @desc Delete a blog post
 * @route DELETE /api/blog/:id
 */
export const deleteBlogPost = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    if (!req.user) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    const { id } = req.params;
    if (!validateObjectId(id)) {
      sendResponse(res, 400, false, "Invalid post ID");
      return;
    }

    const post = await blogService.deleteBlogPostService(req.user.id, id);
    sendResponse(res, 200, true, "Blog post deleted", { post });
  }
);

export default {
  createBlogPost,
  toggleLikeBlogPost,
  addComment,
  removeComment,
  getAllBlogPosts,
  getBlogPostById,
  editBlogPost,
  deleteBlogPost,
};
