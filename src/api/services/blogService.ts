import mongoose from "mongoose";
import BlogPost from "../models/BlogPost";  // Corrected import for default export
import { IBlogPost } from "../models/BlogPost"; // Importing the interface to use as return type
import Notification from "../models/Notification";
import { IComment } from "../models/BlogPost"; // To handle comments

export const createBlogPostService = async (
  userId: string,
  title: string,
  content: string,
  category: string
): Promise<IBlogPost> => { // Explicit return type
  try {
    const newPost = new BlogPost({
      author: userId,
      title,
      content,
      category,
      likes: [],
      comments: [],
    });
  
    await newPost.save();
    return newPost;
  } catch (error) {
    throw new Error(`Error creating blog post: ${(error as Error).message}`);
  }
};

// Toggle like/unlike a blog post
export const toggleLikeBlogPostService = async (userId: string, postId: string): Promise<IBlogPost> => {
  try {
    const post = await BlogPost.findById(postId);

    if (!post) {
      throw new Error("Blog post not found");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const likeIndex = post.likes.findIndex((like) => like.equals(userObjectId));

    if (likeIndex === -1) {
      // Like the post
      post.likes.push(userObjectId);
      
      // Create notification
      await Notification.create({
        user: post.author,
        message: `You received a like on your blog post "${post.title}"`,
        type: "success",
        link: `/blog/${postId}`,
        read: false,
      });
    } else {
      // Unlike the post
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    return post;
  } catch (error) {
    throw new Error(`Error toggling like on blog post: ${(error as Error).message}`);
  }
};

// Add a comment to a blog post
export const addCommentService = async (userId: string, postId: string, text: string): Promise<IBlogPost> => {
  try {
    const post = await BlogPost.findById(postId);
    if (!post) {
      throw new Error("Blog post not found");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const newComment: IComment = {
      _id: new mongoose.Types.ObjectId(),
      user: userObjectId,
      text,
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    // Create notification for the post author
    await Notification.create({
      user: post.author,
      message: `${userId} commented on your blog post "${post.title}".`,
      type: "info",
      link: `/blog/${postId}`,
      read: false,
    });

    return post;
  } catch (error) {
    throw new Error(`Error adding comment: ${(error as Error).message}`);
  }
};

// Remove a comment from a blog post
export const removeCommentService = async (userId: string, postId: string, commentId: string): Promise<IBlogPost> => {
  try {
    const post = await BlogPost.findById(postId);
    if (!post) {
      throw new Error("Blog post not found");
    }
  
    const commentIndex = post.comments.findIndex((comment) => comment._id.toString() === commentId);
    if (commentIndex === -1) {
      throw new Error("Comment not found");
    }

    if (post.comments[commentIndex].user.toString() !== userId) {
      throw new Error("You are not authorized to delete this comment");
    }

    post.comments.splice(commentIndex, 1);
    await post.save();
    return post;
  } catch (error) {
    throw new Error(`Error removing comment: ${(error as Error).message}`);
  }
};

// Get all blog posts (with pagination)
export const getAllBlogPostsService = async (limit: number, page: number): Promise<IBlogPost[]> => {
  try {
    const posts = await BlogPost.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return posts;
  } catch (error) {
    throw new Error(`Error fetching blog posts: ${(error as Error).message}`);
  }
};

// Get a single blog post by ID
export const getBlogPostByIdService = async (postId: string): Promise<IBlogPost> => {
  try {
    const post = await BlogPost.findById(postId);
    if (!post) {
      throw new Error("Blog post not found");
    }
    return post;
  } catch (error) {
    throw new Error(`Error fetching blog post: ${(error as Error).message}`);
  }
};

// Update a blog post
export const updateBlogPostService = async (userId: string, postId: string, title?: string, content?: string, category?: string): Promise<IBlogPost> => {
  try {
    const post = await BlogPost.findById(postId);
    if (!post) {
      throw new Error("Blog post not found");
    }

    if (post.author.toString() !== userId) {
      throw new Error("You are not authorized to update this blog post");
    }

    post.title = title || post.title;
    post.content = content || post.content;
    post.category = category || post.category;

    await post.save();
    return post;
  } catch (error) {
    throw new Error(`Error updating blog post: ${(error as Error).message}`);
  }
};

// Delete a blog post
export const deleteBlogPostService = async (userId: string, postId: string): Promise<IBlogPost> => {
  try {
    const post = await BlogPost.findById(postId);
    if (!post) {
      throw new Error("Blog post not found");
    }

    if (post.author.toString() !== userId) {
      throw new Error("You are not authorized to delete this blog post");
    }

    await post.deleteOne();
    return post;
  } catch (error) {
    throw new Error(`Error deleting blog post: ${(error as Error).message}`);
  }
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
