import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the Review interface
export interface IReview extends Document {
  user: Types.ObjectId;
  reviewedUser: Types.ObjectId;
  rating: number;
  comment?: string;
  isAnonymous: boolean;
  flagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Extend the model interface for custom static methods
interface IReviewModel extends Model<IReview> {
  getReviewsForUser(userId: Types.ObjectId): Promise<IReview[]>;
  flagReview(reviewId: string): Promise<IReview | null>;
  getAverageRating(userId: Types.ObjectId): Promise<number | null>;
}

// Define the Review schema
const ReviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reviewedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  },
);

// Compound index for optimized queries
ReviewSchema.index({ user: 1, reviewedUser: 1 });
ReviewSchema.index({ rating: -1 });
ReviewSchema.index({ flagged: 1 });

// Pre-save hook to sanitize comment
ReviewSchema.pre("save", function (next) {
  if (this.isModified("comment")) {
    this.comment = this.comment?.trim();
  }
  next();
});

// Static method to get reviews for a specific user
ReviewSchema.statics.getReviewsForUser = async function (
  userId: Types.ObjectId,
): Promise<IReview[]> {
  return this.find({ reviewedUser: userId })
    .populate("user", "username")
    .sort({ createdAt: -1 });
};

// Static method to flag a review
ReviewSchema.statics.flagReview = async function (
  reviewId: string,
): Promise<IReview | null> {
  const review = await this.findById(reviewId);
  if (review) {
    review.flagged = true;
    await review.save();
  }
  return review;
};

// Static method to calculate the average rating for a user
ReviewSchema.statics.getAverageRating = async function (
  userId: Types.ObjectId,
): Promise<number | null> {
  const result = await this.aggregate([
    { $match: { reviewedUser: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$reviewedUser", avgRating: { $avg: "$rating" } } },
  ]);
  return result.length ? result[0].avgRating : null;
};

// Export the Review model
export const Review: IReviewModel = mongoose.model<IReview, IReviewModel>(
  "Review",
  ReviewSchema,
);

export default Review;
