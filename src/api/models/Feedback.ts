import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import sanitize from "mongo-sanitize";

// --- Types & Interfaces ---
export type FeedbackType = "bug" | "feature-request" | "other";
export type FeedbackStatus = "pending" | "reviewed" | "resolved";
export type FeedbackPriority = "low" | "medium" | "high";

export interface IFeedback extends Document {
  userId: Types.ObjectId;
  message: string;
  type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  isAnonymous: boolean;
  relatedFeature?: string;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  markAsReviewed(this: IFeedback): Promise<IFeedback>;
}

export interface IFeedbackModel extends Model<IFeedback> {
  getFeedbackByType(feedbackType: FeedbackType): Promise<IFeedback[]>;
}

// --- Schema Definition ---
const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: { type: String, required: [true, "Message is required"], trim: true, maxlength: [1000, "Message cannot exceed 1000 characters"] },
    type: { type: String, enum: ["bug","feature-request","other"], default: "other", index: true },
    status: { type: String, enum: ["pending","reviewed","resolved"], default: "pending", index: true },
    priority: { type: String, enum: ["low","medium","high"], default: "medium" },
    isAnonymous: { type: Boolean, default: false },
    relatedFeature: { type: String, trim: true, maxlength: [255, "Related feature cannot exceed 255 characters"] },
  },
  { timestamps: true }
);

// --- Indexes ---
FeedbackSchema.index({ type: 1 });
FeedbackSchema.index({ status: 1 });
FeedbackSchema.index({ createdAt: -1 });

// --- Middleware ---
FeedbackSchema.pre<IFeedback>("save", function (next: (err?: Error) => void): void {
  this.message = sanitize(this.message);
  if (this.relatedFeature) {
    this.relatedFeature = sanitize(this.relatedFeature);
  }
  next();
});

// --- Instance Methods ---
FeedbackSchema.methods.markAsReviewed = async function (this: IFeedback): Promise<IFeedback> {
  this.status = "reviewed";
  await this.save();
  return this;
};

// --- Static Methods ---
FeedbackSchema.statics.getFeedbackByType = async function (
  feedbackType: FeedbackType
): Promise<IFeedback[]> {
  return this.find({ type: feedbackType }).sort({ createdAt: -1 });
};

// --- Model Export ---
export const Feedback = mongoose.model<IFeedback, IFeedbackModel>("Feedback", FeedbackSchema);
export default Feedback;
