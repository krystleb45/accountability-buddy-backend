// src/api/services/blogService.ts
import mongoose from "mongoose";
import BlogPost, { IBlogPost } from "../models/BlogPost";
import Notification from "../models/Notification";

export const createBlogPostService = async (
  userId: string,
  title: string,
  content: string,
  category: string
): Promise<IBlogPost> => {
  const post = new BlogPost({
    author: userId,
    title,
    content,
    category,
    likes: [],
    comments: [],
  });
  await post.save();
  return post;
};

export const toggleLikeBlogPostService = async (
  userId: string,
  postId: string
): Promise<IBlogPost> => {
  const post = await BlogPost.findById(postId);
  if (!post) throw new Error("Blog post not found");

  const uid = new mongoose.Types.ObjectId(userId);
  const idx = post.likes.findIndex((l) => l.equals(uid));

  if (idx === -1) {
    post.likes.push(uid);
    await Notification.create({
      user: post.author,
      message: `You received a like on your blog post "${post.title}"`,
      type: "success",
      link: `/blog/${postId}`,
      read: false,
    });
  } else {
    post.likes.splice(idx, 1);
  }

  await post.save();
  return post;
};

export const addCommentService = async (
  userId: string,
  postId: string,
  text: string
): Promise<IBlogPost> => {
  const post = await BlogPost.findById(postId);
  if (!post) throw new Error("Blog post not found");

  const uid = new mongoose.Types.ObjectId(userId);
  // create a real sub-document
  const commentDoc = post.comments.create({
    user: uid,
    text,
    createdAt: new Date(),
  });
  post.comments.push(commentDoc as any);
  await post.save();

  await Notification.create({
    user: post.author,
    message: `${userId} commented on your blog post "${post.title}".`,
    type: "info",
    link: `/blog/${postId}`,
    read: false,
  });

  return post;
};

export const removeCommentService = async (
  userId: string,
  postId: string,
  commentId: string
): Promise<IBlogPost> => {
  const post = await BlogPost.findById(postId);
  if (!post) throw new Error("Blog post not found");

  const idx = post.comments.findIndex((c) => c._id.toString() === commentId);
  if (idx === -1) throw new Error("Comment not found");
  if (post.comments[idx].user.toString() !== userId) {
    throw new Error("You are not authorized to delete this comment");
  }

  post.comments.splice(idx, 1);
  await post.save();
  return post;
};

export const getAllBlogPostsService = async (
  limit: number,
  page: number
): Promise<IBlogPost[]> => {
  return BlogPost.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

export const getBlogPostByIdService = async (
  postId: string
): Promise<IBlogPost> => {
  const post = await BlogPost.findById(postId);
  if (!post) throw new Error("Blog post not found");
  return post;
};

export const updateBlogPostService = async (
  userId: string,
  postId: string,
  title?: string,
  content?: string,
  category?: string
): Promise<IBlogPost> => {
  const post = await BlogPost.findById(postId);
  if (!post) throw new Error("Blog post not found");
  if (post.author.toString() !== userId) {
    throw new Error("You are not authorized to update this blog post");
  }
  if (title) post.title = title;
  if (content) post.content = content;
  if (category) post.category = category;
  await post.save();
  return post;
};

export const deleteBlogPostService = async (
  userId: string,
  postId: string
): Promise<IBlogPost> => {
  const post = await BlogPost.findById(postId);
  if (!post) throw new Error("Blog post not found");
  if (post.author.toString() !== userId) {
    throw new Error("You are not authorized to delete this blog post");
  }
  await post.deleteOne();
  return post;
};

export default {
  createBlogPostService,
  toggleLikeBlogPostService,
  addCommentService,
  removeCommentService,
  getAllBlogPostsService,
  getBlogPostByIdService,
  updateBlogPostService,
  deleteBlogPostService,
};
