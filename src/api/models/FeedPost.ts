import type { Document, Model } from "mongoose";
import mongoose, { Schema, Types as MongooseTypes } from "mongoose";
import sanitize from "mongo-sanitize";

// --- Comment Subdocument Interface ---
export interface IFeedComment extends Document {
  _id: MongooseTypes.ObjectId;
  user: MongooseTypes.ObjectId;
  text: string;
  createdAt: Date;
}

const FeedCommentSchema = new Schema<IFeedComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true, timestamps: false }
);

// --- FeedPost Interface ---
export interface IFeedPost extends Document {
  user: MongooseTypes.ObjectId;
  content: string;
  likes: MongooseTypes.ObjectId[];
  comments: mongoose.Types.DocumentArray<IFeedComment>;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  likeCount: number;
  commentCount: number;

  // Instance methods
  addLike(userId: MongooseTypes.ObjectId): Promise<IFeedPost>;
  removeLike(userId: MongooseTypes.ObjectId): Promise<IFeedPost>;
  addComment(userId: MongooseTypes.ObjectId, text: string): Promise<IFeedComment>;
  removeComment(commentId: MongooseTypes.ObjectId): Promise<boolean>;
}

// --- Model Interface ---
export interface IFeedPostModel extends Model<IFeedPost> {
  findByUser(userId: MongooseTypes.ObjectId, limit?: number): Promise<IFeedPost[]>;
  findRecent(limit?: number): Promise<IFeedPost[]>;
}

// --- Schema Definition ---
const FeedPostSchema = new Schema<IFeedPost>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: { type: [FeedCommentSchema], default: [] }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// --- Indexes ---
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
  this.comments.forEach(comment => {
    comment.text = sanitize(comment.text);
  });
  next();
});

// --- Instance Methods ---
FeedPostSchema.methods.addLike = async function (this: IFeedPost, userId: MongooseTypes.ObjectId): Promise<IFeedPost> {
  if (!this.likes.some(id => id.equals(userId))) {
    this.likes.push(userId);
    await this.save();
  }
  return this;
};

FeedPostSchema.methods.removeLike = async function (this: IFeedPost, userId: MongooseTypes.ObjectId): Promise<IFeedPost> {
  this.likes = this.likes.filter(id => !id.equals(userId));
  await this.save();
  return this;
};

FeedPostSchema.methods.addComment = async function (
  this: IFeedPost,
  userId: MongooseTypes.ObjectId,
  text: string
): Promise<IFeedComment> {
  const comment = this.comments.create({ user: userId, text });
  this.comments.push(comment);
  await this.save();
  return comment;
};

FeedPostSchema.methods.removeComment = async function (
  this: IFeedPost,
  commentId: MongooseTypes.ObjectId
): Promise<boolean> {
  const idx = this.comments.findIndex(c => c._id.equals(commentId));
  if (idx === -1) return false;
  this.comments.splice(idx, 1);
  await this.save();
  return true;
};

// --- Static Methods ---
FeedPostSchema.statics.findByUser = function (
  userId: MongooseTypes.ObjectId,
  limit = 10
): Promise<IFeedPost[]> {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

FeedPostSchema.statics.findRecent = function (
  limit = 10
): Promise<IFeedPost[]> {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit);
};

// --- Model Export ---
export const FeedPost = mongoose.model<IFeedPost, IFeedPostModel>("FeedPost", FeedPostSchema);
export default FeedPost;
