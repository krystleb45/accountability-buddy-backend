// src/api/models/FeedPost.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import sanitize from "mongo-sanitize";

// --- Comment Subdocument Interface ---
export interface IFeedComment extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
}

const FeedCommentSchema = new Schema<IFeedComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: (): Date => new Date() },
  },
  { _id: true, timestamps: false }
);

// --- FeedPost Interface ---
export interface IFeedPost extends Document {
  user: Types.ObjectId;
  content: string;
  likes: Types.ObjectId[];
  comments: mongoose.Types.DocumentArray<IFeedComment>;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  likeCount: number;
  commentCount: number;

  // Instance methods
  addLike(userId: Types.ObjectId): Promise<IFeedPost>;
  removeLike(userId: Types.ObjectId): Promise<IFeedPost>;
  addComment(userId: Types.ObjectId, text: string): Promise<IFeedComment>;
  removeComment(commentId: Types.ObjectId): Promise<boolean>;
}

// --- Model Interface ---
export interface IFeedPostModel extends Model<IFeedPost> {
  findByUser(userId: Types.ObjectId, limit?: number): Promise<IFeedPost[]>;
  findRecent(limit?: number): Promise<IFeedPost[]>;
}

// --- Schema Definition ---
const FeedPostSchema = new Schema<IFeedPost, IFeedPostModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: { type: [FeedCommentSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes (centralized) ---
FeedPostSchema.index({ user: 1, createdAt: -1 });
FeedPostSchema.index({ createdAt: -1 });

// --- Virtuals ---
FeedPostSchema.virtual("likeCount").get(function (this: IFeedPost): number {
  return this.likes.length;
});
FeedPostSchema.virtual("commentCount").get(function (this: IFeedPost): number {
  return this.comments.length;
});

// --- Middleware ---
FeedPostSchema.pre<IFeedPost>("save", function (next: (err?: Error) => void): void {
  this.content = sanitize(this.content);
  this.comments.forEach((comment) => {
    comment.text = sanitize(comment.text);
  });
  next();
});

// --- Instance Methods ---
FeedPostSchema.methods.addLike = async function (
  this: IFeedPost,
  userId: Types.ObjectId
): Promise<IFeedPost> {
  if (!this.likes.some((id) => id.equals(userId))) {
    this.likes.push(userId);
    await this.save();
  }
  return this;
};

FeedPostSchema.methods.removeLike = async function (
  this: IFeedPost,
  userId: Types.ObjectId
): Promise<IFeedPost> {
  this.likes = this.likes.filter((id) => !id.equals(userId));
  await this.save();
  return this;
};

FeedPostSchema.methods.addComment = async function (
  this: IFeedPost,
  userId: Types.ObjectId,
  text: string
): Promise<IFeedComment> {
  const comment = this.comments.create({ user: userId, text });
  this.comments.push(comment);
  await this.save();
  return comment;
};

FeedPostSchema.methods.removeComment = async function (
  this: IFeedPost,
  commentId: Types.ObjectId
): Promise<boolean> {
  const idx = this.comments.findIndex((c) => c._id.equals(commentId));
  if (idx === -1) return false;
  this.comments.splice(idx, 1);
  await this.save();
  return true;
};

// --- Static Methods ---
FeedPostSchema.statics.findByUser = function (
  this: IFeedPostModel,
  userId: Types.ObjectId,
  limit = 10
): Promise<IFeedPost[]> {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

FeedPostSchema.statics.findRecent = function (
  this: IFeedPostModel,
  limit = 10
): Promise<IFeedPost[]> {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit);
};

// --- Model Export ---
export const FeedPost = mongoose.model<IFeedPost, IFeedPostModel>(
  "FeedPost",
  FeedPostSchema
);
export default FeedPost;
