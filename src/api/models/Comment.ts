import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Types & Interfaces ---
export type CommentableType =
  | "BlogPost"
  | "FeedPost"
  | "Book"
  | "Event"
  | "Message";

export interface IComment extends Document {
  author: Types.ObjectId;            // User who made the comment
  text: string;                      // Comment text
  entityType: CommentableType;      // Type of entity being commented on
  entityId: Types.ObjectId;         // ID of the entity
  parentComment?: Types.ObjectId;    // Reply to another comment
  likes: Types.ObjectId[];           // Users who liked this comment
  createdAt: Date;                   // Auto-generated
  updatedAt: Date;                   // Auto-generated

  // Virtuals
  likeCount: number;

  // Instance methods
  addLike(userId: Types.ObjectId): Promise<IComment>;
  removeLike(userId: Types.ObjectId): Promise<IComment>;
}

export interface ICommentModel extends Model<IComment> {
  getByEntity(
    entityType: CommentableType,
    entityId: Types.ObjectId,
    page?: number,
    pageSize?: number
  ): Promise<IComment[]>;
  getReplies(parentId: Types.ObjectId): Promise<IComment[]>;
}

// --- Schema Definition ---
const CommentSchema = new Schema<IComment, ICommentModel>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    entityType: {
      type: String,
      enum: ["BlogPost","FeedPost","Book","Event","Message"],
      required: true,
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    parentComment: { type: Schema.Types.ObjectId, ref: "Comment", default: null, index: true },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
CommentSchema.index({ entityType: 1, entityId: 1 });
CommentSchema.index({ parentComment: 1, createdAt: -1 });

// --- Virtuals ---
CommentSchema.virtual("likeCount").get(function (this: IComment): number {
  return this.likes.length;
});

// --- Middleware ---
CommentSchema.pre<IComment>("save", function (next): void {
  this.text = this.text.trim();
  next();
});

// --- Instance Methods ---
CommentSchema.methods.addLike = async function (this: IComment, userId: Types.ObjectId): Promise<IComment> {
  if (!this.likes.some(id => id.equals(userId))) {
    this.likes.push(userId);
    await this.save();
  }
  return this;
};

CommentSchema.methods.removeLike = async function (this: IComment, userId: Types.ObjectId): Promise<IComment> {
  this.likes = this.likes.filter(id => !id.equals(userId));
  await this.save();
  return this;
};

// --- Static Methods ---
CommentSchema.statics.getByEntity = async function (
  entityType: CommentableType,
  entityId: Types.ObjectId,
  page = 1,
  pageSize = 20
): Promise<IComment[]> {
  const skip = (page - 1) * pageSize;
  return this.find({ entityType, entityId, parentComment: null })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate("author", "username avatarUrl");
};

CommentSchema.statics.getReplies = async function (
  parentId: Types.ObjectId
): Promise<IComment[]> {
  return this.find({ parentComment: parentId })
    .sort({ createdAt: 1 })
    .populate("author", "username avatarUrl");
};

// --- Model Export ---
export const Comment = mongoose.model<IComment, ICommentModel>("Comment", CommentSchema);
export default Comment;
