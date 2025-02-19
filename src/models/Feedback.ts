import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import sanitize from "mongo-sanitize"; // For sanitizing input

// Define Feedback interface
export interface IFeedback extends Document {
  userId: mongoose.Types.ObjectId;
  message: string;
  type: "bug" | "feature-request" | "other";
  status: "pending" | "reviewed" | "resolved";
  priority: "low" | "medium" | "high";
  isAnonymous: boolean;
  relatedFeature?: string;
  createdAt: Date;
  updatedAt: Date;
  markAsReviewed: () => Promise<void>;
}

interface IFeedbackModel extends Model<IFeedback> {
  getFeedbackByType: (feedbackType: "bug" | "feature-request" | "other") => Promise<IFeedback[]>;
}

// Define Feedback schema
const FeedbackSchema: Schema<IFeedback> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true, // Ensure feedback is always associated with a user
      index: true, // Index for faster lookups
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      maxlength: [1000, "Message cannot exceed 1000 characters"], // Restrict message length
      trim: true, // Remove leading and trailing whitespaces
    },
    type: {
      type: String,
      enum: ["bug", "feature-request", "other"], // Ensure the feedback type is valid
      default: "other",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"], // Track feedback processing status
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"], // Optional field to set priority
      default: "medium",
    },
    isAnonymous: {
      type: Boolean,
      default: false, // Allows users to submit feedback anonymously
    },
    relatedFeature: {
      type: String,
      trim: true,
      maxlength: [255, "Related feature description cannot exceed 255 characters"], // Optional field to link feedback to a specific feature
    },
  },
  {
    timestamps: true, // Automatically add `createdAt` and `updatedAt` fields
  },
);

// Pre-save hook to sanitize message content
FeedbackSchema.pre<IFeedback>("save", function (next) {
  try {
    this.message = sanitize(this.message);
    if (this.relatedFeature) {
      this.relatedFeature = sanitize(this.relatedFeature);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Index to optimize queries by type and status
FeedbackSchema.index({ type: 1 });
FeedbackSchema.index({ status: 1 });
FeedbackSchema.index({ createdAt: 1 });

// Instance method to mark feedback as reviewed
FeedbackSchema.methods.markAsReviewed = async function (): Promise<void> {
  this.status = "reviewed";
  await this.save();
};

// Static method to get feedback by type
FeedbackSchema.statics.getFeedbackByType = async function (
  feedbackType: "bug" | "feature-request" | "other",
): Promise<IFeedback[]> {
  return this.find({ type: feedbackType });
};

// Export the Feedback model
const Feedback: IFeedbackModel = mongoose.model<IFeedback, IFeedbackModel>("Feedback", FeedbackSchema);
export default Feedback;
