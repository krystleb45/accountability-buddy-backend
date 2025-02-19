import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import sanitize from "mongo-sanitize"; // For sanitizing input

// Define the interface for GoalMessage documents
export interface IGoalMessage extends Document {
  goal: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  message: string;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  softDelete: () => Promise<void>;
}

// Define the interface for GoalMessage model statics
interface IGoalMessageModel extends Model<IGoalMessage> {
  getMessagesByGoal(goalId: mongoose.Types.ObjectId, limit?: number): Promise<IGoalMessage[]>;
}

// Define the schema for GoalMessage
const GoalMessageSchema = new Schema<IGoalMessage>(
  {
    goal: {
      type: Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
      index: true, // Optimized indexing for goal-based queries
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Optimized indexing for sender-based queries
    },
    message: {
      type: String,
      required: [true, "Message content is required"],
      trim: true, // Trim leading and trailing whitespaces
      minlength: [1, "Message cannot be empty"],
      maxlength: [500, "Message cannot exceed 500 characters"],
    },
    isDeleted: {
      type: Boolean,
      default: false, // Soft delete flag
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  },
);

// Pre-save hook to sanitize the message content
GoalMessageSchema.pre<IGoalMessage>("save", function (next) {
  try {
    this.message = sanitize(this.message); // Prevent XSS or injection attacks
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Static method for retrieving messages for a goal
GoalMessageSchema.statics.getMessagesByGoal = async function (
  goalId: mongoose.Types.ObjectId,
  limit = 50,
): Promise<IGoalMessage[]> {
  return await this.find({ goal: goalId, isDeleted: false })
    .sort({ createdAt: -1 }) // Sort messages by latest
    .limit(limit)
    .populate("sender", "username profilePicture"); // Populate sender details
};

// Instance method for soft deleting a message
GoalMessageSchema.methods.softDelete = async function (): Promise<void> {
  this.isDeleted = true;
  await this.save();
};

// Indexes for optimization
GoalMessageSchema.index({ goal: 1, createdAt: -1 }); // Compound index for sorting messages by goal and date
GoalMessageSchema.index({ sender: 1, createdAt: -1 }); // Compound index for sorting messages by sender and date

// Export the GoalMessage model
export const GoalMessage: IGoalMessageModel = mongoose.model<IGoalMessage, IGoalMessageModel>(
  "GoalMessage",
  GoalMessageSchema,
);
