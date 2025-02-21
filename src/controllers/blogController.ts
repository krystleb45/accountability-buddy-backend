import type { Request, Response } from "express";
import mongoose from "mongoose";
import BlogPost from "../models/BlogPost";
import Notification from "../models/Notification"; // ✅ Import Notification model
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";

/**
 * @desc Like or Unlike a blog post
 * @route POST /api/blog/:id/like
 * @access Private
 */
export const toggleLikeBlogPost = catchAsync(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
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
  }
);

/**
 * @desc Add a comment to a blog post
 * @route POST /api/blog/:id/comment
 * @access Private
 */
export const addComment = catchAsync(
  async (req: Request<{ id: string }, {}, { text: string }>, res: Response): Promise<void> => {
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

    // ✅ Notify the blog post author about the new comment
    await Notification.create({
      user: post.author,
      message: `${req.user.email} commented on your blog post "${post.title}".`,      type: "info",
      link: `/blog/${(post._id as mongoose.Types.ObjectId).toHexString()}`,      read: false,
    });

    sendResponse(res, 201, true, "Comment added successfully", { post });
  }
);
