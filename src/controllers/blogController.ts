import type { Request, Response } from "express";
import mongoose from "mongoose";
import BlogPost from "../models/BlogPost";
import Notification from "../models/Notification";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

/**
 * @desc Create a new blog post
 * @route POST /api/blog
 * @access Private
 */
export const createBlogPost = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized access");
    return;
  }

  const { title, content } = req.body;

  if (!title || !content) {
    sendResponse(res, 400, false, "Title and content are required");
    return;
  }

  const newPost = await BlogPost.create({
    author: req.user.id,
    title,
    content,
    likes: [],
    comments: [],
    createdAt: new Date(),
  });

  sendResponse(res, 201, true, "Blog post created successfully", { newPost });
});

/**
 * @desc Toggle like/unlike on a blog post
 * @route POST /api/blog/:id/like
 * @access Private
 */
export const toggleLikeBlogPost = catchAsync(async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized access");
    return;
  }

  const userId = new mongoose.Types.ObjectId(req.user.id);
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    sendResponse(res, 400, false, "Invalid blog post ID format");
    return;
  }

  const post = await BlogPost.findById(id);
  if (!post) {
    sendResponse(res, 404, false, "Blog post not found");
    return;
  }

  const likeIndex = post.likes.findIndex((like) => like.equals(userId));

  if (likeIndex === -1) {
    post.likes.push(userId);
    await Notification.create({
      user: post.author,
      message: `${req.user.email} liked your blog post "${post.title}".`,
      type: "success",
      link: `/blog/${(post._id as mongoose.Types.ObjectId).toHexString()}`,
      read: false,
    });
  } else {
    post.likes.splice(likeIndex, 1);
  }

  await post.save();
  sendResponse(res, 200, true, `Blog post ${likeIndex === -1 ? "liked" : "unliked"}`, { post });
});

/**
 * @desc Add a comment to a blog post
 * @route POST /api/blog/:id/comment
 * @access Private
 */
export const addComment = catchAsync(async (
  req: Request<{ id: string }, {}, { text: string }>,
  res: Response
): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized access");
    return;
  }

  const userId = new mongoose.Types.ObjectId(req.user.id);
  const { id } = req.params;
  const { text } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    sendResponse(res, 400, false, "Invalid blog post ID format");
    return;
  }

  if (!text || typeof text !== "string" || text.trim() === "") {
    sendResponse(res, 400, false, "Comment cannot be empty");
    return;
  }

  const post = await BlogPost.findById(id);
  if (!post) {
    sendResponse(res, 404, false, "Blog post not found");
    return;
  }

  post.comments.push({
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    text,
    createdAt: new Date(),
  });

  await post.save();

  await Notification.create({
    user: post.author,
    message: `${req.user.email} commented on your blog post "${post.title}".`,
    type: "info",
    link: `/blog/${(post._id as mongoose.Types.ObjectId).toHexString()}`,
    read: false,
  });

  sendResponse(res, 201, true, "Comment added successfully", { post });
});

/**
 * @desc Remove a comment from a blog post
 * @route DELETE /api/blog/:postId/comment/:commentId
 * @access Private
 */
export const removeComment = catchAsync(async (
  req: Request<{ postId: string; commentId: string }>,
  res: Response
): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized access");
    return;
  }

  const { postId, commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
    sendResponse(res, 400, false, "Invalid ID format");
    return;
  }

  const post = await BlogPost.findById(postId);
  if (!post) {
    sendResponse(res, 404, false, "Blog post not found");
    return;
  }

  const commentIndex = post.comments.findIndex((comment) => comment._id.toString() === commentId);

  if (commentIndex === -1) {
    sendResponse(res, 404, false, "Comment not found");
    return;
  }

  if (post.comments[commentIndex].user.toString() !== req.user.id) {
    sendResponse(res, 403, false, "You are not authorized to delete this comment");
    return;
  }

  post.comments.splice(commentIndex, 1);
  await post.save();

  sendResponse(res, 200, true, "Comment removed successfully", { post });
});

/**
 * @desc Get all blog posts
 * @route GET /api/blog
 * @access Public
 */
export const getAllBlogPosts = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const posts = await BlogPost.find().sort({ createdAt: -1 });
  sendResponse(res, 200, true, "Blog posts retrieved successfully", { posts });
});

/**
 * @desc Get a single blog post by ID
 * @route GET /api/blog/:id
 * @access Public
 */
export const getBlogPostById = catchAsync(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    sendResponse(res, 400, false, "Invalid blog post ID format");
    return;
  }

  const post = await BlogPost.findById(id);
  if (!post) {
    sendResponse(res, 404, false, "Blog post not found");
    return;
  }

  sendResponse(res, 200, true, "Blog post retrieved successfully", { post });
});

/**
 * @desc Edit a blog post
 * @route PUT /api/blog/:id
 * @access Private
 */
export const editBlogPost = catchAsync(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized access");
    return;
  }

  const { id } = req.params;
  const { title, content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    sendResponse(res, 400, false, "Invalid blog post ID format");
    return;
  }

  const post = await BlogPost.findById(id);
  if (!post) {
    sendResponse(res, 404, false, "Blog post not found");
    return;
  }

  if (post.author.toString() !== req.user.id) {
    sendResponse(res, 403, false, "You are not authorized to edit this post");
    return;
  }

  post.title = title || post.title;
  post.content = content || post.content;
  await post.save();

  sendResponse(res, 200, true, "Blog post updated successfully", { post });
});
/**
 * @desc Delete a blog post
 * @route DELETE /api/blog/:id
 * @access Private
 */
export const deleteBlogPost = catchAsync(async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  if (!req.user) {
    sendResponse(res, 401, false, "Unauthorized access");
    return;
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    sendResponse(res, 400, false, "Invalid blog post ID format");
    return;
  }

  const post = await BlogPost.findById(id);
  if (!post) {
    sendResponse(res, 404, false, "Blog post not found");
    return;
  }

  if (post.author.toString() !== req.user.id) {
    sendResponse(res, 403, false, "You are not authorized to delete this post");
    return;
  }

  await BlogPost.deleteOne({ _id: id });
  sendResponse(res, 200, true, "Blog post deleted successfully");
});
/**
 * ✅ Only Added `addComment` and `removeComment`
 */
