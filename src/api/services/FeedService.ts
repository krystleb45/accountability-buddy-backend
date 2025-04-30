// src/api/services/feedService.ts
import mongoose from "mongoose";
import FeedPost, { IFeedPost } from "../models/FeedPost";

class FeedService {
  /** Fetch all feed posts (most recent first) */
  static async getFeed(): Promise<IFeedPost[]> {
    return FeedPost.find()
      .sort({ createdAt: -1 })
      .populate("user", "username")
      .populate("comments.user", "username")
      .exec();
  }

  /** Create a new feed post */
  static async createPost(
    userId: string,
    goalId: string,
    milestone: string,
    message?: string
  ): Promise<IFeedPost> {
    const post = new FeedPost({
      user: new mongoose.Types.ObjectId(userId),
      goal: goalId,
      milestone,
      message: message?.trim() || "",
      likes: [],
      comments: [],
      createdAt: new Date(),
    });
    return post.save();
  }

  /** Like a post */
  static async addLike(
    userId: string,
    postId: string
  ): Promise<IFeedPost> {
    const post = await FeedPost.findById(postId);
    if (!post) throw new Error("Post not found");
    const uid = new mongoose.Types.ObjectId(userId);
    if (post.likes.some(l => l.equals(uid))) {
      throw new Error("Already liked");
    }
    post.likes.push(uid);
    return post.save();
  }

  /** Unlike a post */
  static async removeLike(
    userId: string,
    postId: string
  ): Promise<IFeedPost> {
    const post = await FeedPost.findById(postId);
    if (!post) throw new Error("Post not found");
    post.likes = post.likes.filter(l => l.toString() !== userId);
    return post.save();
  }

  /** Add a comment */
  static async addComment(
    userId: string,
    postId: string,
    text: string
  ): Promise<IFeedPost> {
    const post = await FeedPost.findById(postId);
    if (!post) throw new Error("Post not found");
    const comment = {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(userId),
      text: text.trim(),
      createdAt: new Date(),
    };
    post.comments.push(comment as any);
    return post.save();
  }

  /** Remove a comment */
  static async removeComment(
    userId: string,
    postId: string,
    commentId: string
  ): Promise<IFeedPost> {
    const post = await FeedPost.findById(postId);
    if (!post) throw new Error("Post not found");

    const idx = post.comments.findIndex(c => c._id.toString() === commentId);
    if (idx === -1) throw new Error("Comment not found");

    const comment = post.comments[idx];
    if (
      comment.user.toString() !== userId &&
      post.user.toString() !== userId
    ) {
      throw new Error("Unauthorized to delete this comment");
    }

    post.comments.splice(idx, 1);
    return post.save();
  }
}

export default FeedService;
