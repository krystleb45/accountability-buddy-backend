import type { Document, Model, Types, Query } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Interface for Post Document
export interface IPost extends Document {
  user: Types.ObjectId;
  content: string;
  likes: Types.ObjectId[];
  comments: Types.ObjectId[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt?: Date;
  likeCount: number;
  commentCount: number;
}

// Define Post Schema
const PostSchema = new Schema<IPost>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Post content is required"],
      trim: true,
      maxlength: [500, "Content cannot exceed 500 characters"],
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Comment",
        index: true,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual field for the number of likes
PostSchema.virtual("likeCount").get(function () {
  return this.likes.length;
});

// Virtual field for the number of comments
PostSchema.virtual("commentCount").get(function () {
  return this.comments.length;
});

// Indexes for optimized querying
PostSchema.index({ createdAt: -1 });
PostSchema.index({ user: 1, createdAt: -1 });

// Pre-save middleware to update the 'updatedAt' timestamp
PostSchema.pre<IPost>("save", function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// Static method to add a like to a post
PostSchema.statics.addLike = async function (
  postId: string,
  userId: string,
): Promise<IPost> {
  const post = await this.findById(postId);
  if (!post) throw new Error("Post not found");

  const userObjectId = new mongoose.Types.ObjectId(userId);

  if (!post.likes.some((like: Types.ObjectId) => like.equals(userObjectId))) {
    post.likes.push(userObjectId);
    await post.save();
  }

  return post;
};

// Static method to remove a like from a post
PostSchema.statics.removeLike = async function (
  postId: string,
  userId: string,
): Promise<IPost> {
  const post = await this.findById(postId);
  if (!post) throw new Error("Post not found");

  const userObjectId = new mongoose.Types.ObjectId(userId);

  post.likes = post.likes.filter(
    (like: Types.ObjectId) => !like.equals(userObjectId),
  );
  await post.save();

  return post;
};

// Static method to soft delete a post
PostSchema.statics.softDelete = async function (postId: string): Promise<IPost> {
  const post = await this.findById(postId);
  if (!post) throw new Error("Post not found");

  post.isDeleted = true;
  await post.save();

  return post;
};

// Middleware for populating comments on query
PostSchema.pre<Query<IPost[], IPost>>(/^find/, function (next) {
  this.populate({
    path: "comments",
    select: "content user createdAt",
  });
  next();
});

// Export Post Model
export const Post: Model<IPost> = mongoose.model<IPost>("Post", PostSchema);
