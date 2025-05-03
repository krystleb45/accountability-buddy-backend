// src/api/models/Review.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Review Document Interface ---
export interface IReview extends Document {
  user: Types.ObjectId;
  reviewedUser: Types.ObjectId;
  rating: number;
  comment?: string;
  isAnonymous: boolean;
  flagged: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  sanitizeComment(): IReview;
  markFlagged(): Promise<IReview>;
}

// --- Review Model Static Interface ---
export interface IReviewModel extends Model<IReview> {
  getReviewsForUser(userId: Types.ObjectId): Promise<IReview[]>;
  flagReview(reviewId: string): Promise<IReview | null>;
  getAverageRating(userId: Types.ObjectId): Promise<number | null>;
}

// --- Schema Definition ---
const ReviewSchema = new Schema<IReview, IReviewModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    flagged: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// --- Indexes ---
ReviewSchema.index({ user: 1, reviewedUser: 1 });
ReviewSchema.index({ rating: -1 });
ReviewSchema.index({ flagged: 1 });

// --- Instance Methods ---
// Trim and sanitize comment text
ReviewSchema.methods.sanitizeComment = function (this: IReview): IReview {
  if (this.comment) {
    this.comment = this.comment.trim();
  }
  return this;
};

// Mark this review as flagged
ReviewSchema.methods.markFlagged = async function (this: IReview): Promise<IReview> {
  this.flagged = true;
  return this.save();
};

// --- Hooks ---
// Apply comment sanitization before save
ReviewSchema.pre<IReview>("save", function (next): void {
  this.sanitizeComment();
  next();
});

// --- Static Methods ---
ReviewSchema.statics.getReviewsForUser = function (
  this: IReviewModel,
  userId: Types.ObjectId
): Promise<IReview[]> {
  return this.find({ reviewedUser: userId })
    .populate("user", "username")
    .sort({ createdAt: -1 })
    .exec();
};

ReviewSchema.statics.flagReview = async function (
  this: IReviewModel,
  reviewId: string
): Promise<IReview | null> {
  const review = await this.findById(reviewId).exec();
  if (review) {
    return review.markFlagged();
  }
  return null;
};

ReviewSchema.statics.getAverageRating = async function (
  this: IReviewModel,
  userId: Types.ObjectId
): Promise<number | null> {
  const result = await this.aggregate([
    { $match: { reviewedUser: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$reviewedUser", avgRating: { $avg: "$rating" } } },
  ]).exec();
  return result.length ? (result[0].avgRating as number) : null;
};

// --- Model Export ---
export const Review = mongoose.model<IReview, IReviewModel>(
  "Review",
  ReviewSchema
);

export default Review;
