import type { Document, Model, Types, Query } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Post Document Interface ---
export interface IPost extends Document {
  user: Types.ObjectId;
  content: string;
  likes: Types.ObjectId[];
  comments: Types.ObjectId[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt?: Date;

  // Virtuals
  likeCount: number;
  commentCount: number;
}

// --- Post Model Static Interface ---
export interface IPostModel extends Model<IPost> {
  addLike(postId: string, userId: string): Promise<IPost>;
  removeLike(postId: string, userId: string): Promise<IPost>;
  softDelete(postId: string): Promise<IPost>;
}

// --- Schema Definition ---
const PostSchema = new Schema<IPost, IPostModel, IPost>(
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
  }
);

// --- Virtual Fields ---
PostSchema.virtual("likeCount").get(function (this: IPost): number {
  return this.likes.length;
});

PostSchema.virtual("commentCount").get(function (this: IPost): number {
  return this.comments.length;
});

// --- Indexes ---
PostSchema.index({ createdAt: -1 });
PostSchema.index({ user: 1, createdAt: -1 });

// --- Middleware ---
PostSchema.pre<IPost>("save", function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// Populate comments content and user info on queries
PostSchema.pre<Query<any, IPost>>(/^find/, function (next) {
  this.populate({
    path: "comments",
    select: "content user createdAt",
  });
  next();
});

// --- Static Methods ---
PostSchema.statics.addLike = async function (
  this: IPostModel,
  postId: string,
  userId: string
): Promise<IPost> {
  const post = await this.findById(postId);
  if (!post) throw new Error("Post not found");

  const userObj = new mongoose.Types.ObjectId(userId);
  if (!post.likes.some(l => l.equals(userObj))) {
    post.likes.push(userObj);
    await post.save();
  }
  return post;
};

PostSchema.statics.removeLike = async function (
  this: IPostModel,
  postId: string,
  userId: string
): Promise<IPost> {
  const post = await this.findById(postId);
  if (!post) throw new Error("Post not found");

  const userObj = new mongoose.Types.ObjectId(userId);
  post.likes = post.likes.filter(l => !l.equals(userObj));
  await post.save();
  return post;
};

PostSchema.statics.softDelete = async function (
  this: IPostModel,
  postId: string
): Promise<IPost> {
  const post = await this.findById(postId);
  if (!post) throw new Error("Post not found");
  post.isDeleted = true;
  await post.save();
  return post;
};

// --- Model Export ---
export const Post = mongoose.model<IPost, IPostModel>("Post", PostSchema);
export default Post;
