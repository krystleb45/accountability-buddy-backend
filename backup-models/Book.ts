// src/api/models/Book.ts

import type { Document, Model } from "mongoose";
import mongoose, { Schema, Types as MongooseTypes } from "mongoose";

// --- Comment Subdocument ---
export interface IBookComment extends Document {
  _id: MongooseTypes.ObjectId;
  user: MongooseTypes.ObjectId;
  text: string;
  createdAt: Date;
}

const BookCommentSchema = new Schema<IBookComment>(
  {
    user:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    text:      { type: String, required: true, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true, timestamps: false }
);

// --- Book Interface ---
export interface IBook extends Document {
  title:       string;
  author:      string;
  category:    string;
  description: string;
  coverImage?: string;
  addedBy:     MongooseTypes.ObjectId;
  likes:       MongooseTypes.ObjectId[];
  comments:    mongoose.Types.DocumentArray<IBookComment>;
  createdAt:   Date;
  updatedAt:   Date;

  // Virtuals
  likeCount:    number;
  commentCount: number;

  // Instance methods
  addLike(userId: MongooseTypes.ObjectId): Promise<IBook>;
  removeLike(userId: MongooseTypes.ObjectId): Promise<IBook>;
  addComment(userId: MongooseTypes.ObjectId, text: string): Promise<IBookComment>;
  removeComment(commentId: MongooseTypes.ObjectId): Promise<boolean>;
}

// --- Model Interface ---
export interface IBookModel extends Model<IBook> {
  findByCategory(this: IBookModel, category: string, limit?: number): Promise<IBook[]>;
  findRecent   (this: IBookModel, limit?: number): Promise<IBook[]>;
}

// --- Schema Definition ---
const BookSchema = new Schema<IBook, IBookModel>(
  {
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    author:      { type: String, required: true, trim: true, maxlength: 150 },
    category:    { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    coverImage: {
      type: String,
      trim: true,
      validate: {
        validator: (url: string): boolean =>
          /^(https?:\/\/.+\.(png|jpg|jpeg|gif|svg))$/.test(url),
        message: "Invalid cover image URL format",
      },
    },
    addedBy:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    likes:    [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: { type: [BookCommentSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// --- Virtuals ---
BookSchema.virtual("likeCount").get(function (this: IBook): number {
  return this.likes.length;
});
BookSchema.virtual("commentCount").get(function (this: IBook): number {
  return this.comments.length;
});

// --- Middleware ---
// Deduplicate likes array before every save
BookSchema.pre<IBook>("save", function (next): void {
  const unique = Array.from(new Set(this.likes.map((id) => id.toString())));
  this.likes = unique.map((id) => new mongoose.Types.ObjectId(id));
  next();
});

// --- Instance Methods ---
BookSchema.methods.addLike = async function (
  this: IBook,
  userId: MongooseTypes.ObjectId
): Promise<IBook> {
  if (!this.likes.some((id) => id.equals(userId))) {
    this.likes.push(userId);
    await this.save();
  }
  return this;
};

BookSchema.methods.removeLike = async function (
  this: IBook,
  userId: MongooseTypes.ObjectId
): Promise<IBook> {
  this.likes = this.likes.filter((id) => !id.equals(userId));
  await this.save();
  return this;
};

BookSchema.methods.addComment = async function (
  this: IBook,
  userId: MongooseTypes.ObjectId,
  text: string
): Promise<IBookComment> {
  const comment = this.comments.create({ user: userId, text });
  this.comments.push(comment);
  await this.save();
  return comment;
};

BookSchema.methods.removeComment = async function (
  this: IBook,
  commentId: MongooseTypes.ObjectId
): Promise<boolean> {
  const idx = this.comments.findIndex((c) => c._id.equals(commentId));
  if (idx === -1) return false;
  this.comments.splice(idx, 1);
  await this.save();
  return true;
};

// --- Static Methods ---
BookSchema.statics.findByCategory = function (
  this: IBookModel,
  category: string,
  limit = 10
): Promise<IBook[]> {
  return this.find({ category }).sort({ createdAt: -1 }).limit(limit).exec();
};

BookSchema.statics.findRecent = function (
  this: IBookModel,
  limit = 10
): Promise<IBook[]> {
  return this.find().sort({ createdAt: -1 }).limit(limit).exec();
};

// --- Indexes ---
// Compound and single‑field indexes declared here:
BookSchema.index({ title:    1, category: 1 });
BookSchema.index({ author:   1, createdAt:-1 });
BookSchema.index({ addedBy:  1 });

// --- Model Export ---
export const Book = mongoose.model<IBook, IBookModel>("Book", BookSchema);
export default Book;
