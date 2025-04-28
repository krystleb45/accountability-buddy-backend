import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema, Types as MongooseTypes } from "mongoose";
import sanitize from "mongo-sanitize";

// --- Comment Subdocument Interface & Schema ---
export interface IComment extends Document {
  _id: MongooseTypes.ObjectId;
  user: MongooseTypes.ObjectId;
  text: string;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true, timestamps: false }
);

// --- BlogPost Interface ---
export interface IBlogPost extends Document {
  title: string;
  content: string;
  category: string;
  imageUrl?: string;
  author: MongooseTypes.ObjectId;
  likes: MongooseTypes.ObjectId[];
  comments: Types.DocumentArray<IComment>;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  likeCount: number;
  commentCount: number;

  // Instance methods
  addLike(userId: MongooseTypes.ObjectId): Promise<IBlogPost>;
  removeLike(userId: MongooseTypes.ObjectId): Promise<IBlogPost>;
  addComment(userId: MongooseTypes.ObjectId, text: string): Promise<IComment>;
  removeComment(commentId: MongooseTypes.ObjectId): Promise<boolean>;
}

// --- BlogPost Model Interface ---
export interface IBlogPostModel extends Model<IBlogPost> {
  findByCategory(category: string, limit?: number): Promise<IBlogPost[]>;
  findRecent(limit?: number): Promise<IBlogPost[]>;
}

// --- Schema Definition ---
const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200, index: true },
    content: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, maxlength: 100, index: true },
    imageUrl: { type: String, trim: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: { type: [CommentSchema], default: [] }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// --- Virtuals ---
BlogPostSchema.virtual("likeCount").get(function (this: IBlogPost): number {
  return this.likes.length;
});

BlogPostSchema.virtual("commentCount").get(function (this: IBlogPost): number {
  return this.comments.length;
});

// --- Middleware ---
BlogPostSchema.pre<IBlogPost>("save", function (this: IBlogPost, next): void {
  this.title = sanitize(this.title);
  this.content = sanitize(this.content);
  this.category = sanitize(this.category);
  next();
});

// --- Instance Methods ---
BlogPostSchema.methods.addLike = async function (this: IBlogPost, userId: MongooseTypes.ObjectId): Promise<IBlogPost> {
  if (!this.likes.includes(userId)) this.likes.push(userId);
  await this.save();
  return this;
};

BlogPostSchema.methods.removeLike = async function (this: IBlogPost, userId: MongooseTypes.ObjectId): Promise<IBlogPost> {
  this.likes = this.likes.filter(id => !id.equals(userId));
  await this.save();
  return this;
};

BlogPostSchema.methods.addComment = async function (
  this: IBlogPost,
  userId: MongooseTypes.ObjectId,
  text: string
): Promise<IComment> {
  const comment = this.comments.create({ user: userId, text });
  this.comments.push(comment);
  await this.save();
  return comment;
};

BlogPostSchema.methods.removeComment = async function (
  this: IBlogPost,
  commentId: MongooseTypes.ObjectId
): Promise<boolean> {
  const idx = this.comments.findIndex(c => c._id.equals(commentId));
  if (idx === -1) return false;
  this.comments.splice(idx, 1);
  await this.save();
  return true;
};

// --- Static Methods ---
BlogPostSchema.statics.findByCategory = function (
  category: string,
  limit = 10
): Promise<IBlogPost[]> {
  return this.find({ category }).sort({ createdAt: -1 }).limit(limit);
};

BlogPostSchema.statics.findRecent = function (
  limit = 10
): Promise<IBlogPost[]> {
  return this.find().sort({ createdAt: -1 }).limit(limit);
};

// --- Indexes ---
BlogPostSchema.index({ title: 1, category: 1 });
BlogPostSchema.index({ createdAt: -1 });

// --- Model Export ---
export const BlogPost = mongoose.model<IBlogPost, IBlogPostModel>("BlogPost", BlogPostSchema);
export default BlogPost;
