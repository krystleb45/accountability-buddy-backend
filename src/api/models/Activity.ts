import type { Document, Model, CallbackError } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the Activity interface
export interface Activity extends Document {
  user: mongoose.Types.ObjectId; // Reference to the User model
  type:
    | "goal"
    | "reminder"
    | "post"
    | "message"
    | "login"
    | "logout"
    | "signup"
    | "friend_request"
    | "friend_accept"
    | "comment"
    | "reaction"
    | "achievement"; // Expanded activity types
  description?: string; // Optional activity description
  metadata: Record<string, any>; // Flexible metadata storage
  isDeleted?: boolean; // Soft delete feature
  createdAt: Date;
  updatedAt: Date;
}

// Define the Activity Schema
const ActivitySchema = new Schema<Activity>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    type: {
      type: String,
      enum: [
        "goal",
        "reminder",
        "post",
        "message",
        "login",
        "logout",
        "signup",
        "friend_request",
        "friend_accept",
        "comment",
        "reaction",
        "achievement",
      ],
      required: [true, "Activity type is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    metadata: {
      type: Object, // Using a flexible object for metadata
      default: {},
    },
    isDeleted: {
      type: Boolean,
      default: false, // Soft delete feature
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for optimized queries
ActivitySchema.index({ user: 1, type: 1, createdAt: -1 });
ActivitySchema.index({ createdAt: -1 });

// Virtual field to get a readable activity type
ActivitySchema.virtual("activityType").get(function (this: Activity) {
  return this.type.charAt(0).toUpperCase() + this.type.slice(1);
});

// ✅ Virtual field to generate user-friendly activity messages
ActivitySchema.virtual("formattedMessage").get(function (this: Activity) {
  switch (this.type) {
    case "goal":
      return `Completed goal: ${this.metadata.goalName || "a goal"}`;
    case "friend_request":
      return `Sent a friend request to ${this.metadata.recipientName || "someone"}`;
    case "friend_accept":
      return `Became friends with ${this.metadata.friendName || "someone"}`;
    case "comment":
      return `Commented: "${this.metadata.commentText || "a comment"}"`;
    case "reaction":
      return `Reacted with ${this.metadata.reactionType || "a reaction"}`;
    case "achievement":
      return `Earned a new badge: ${this.metadata.achievementName || "an achievement"}`;
    default:
      return "Performed an activity";
  }
});

// ✅ Pre-save hook for validation
ActivitySchema.pre("save", function (next: (err?: CallbackError) => void) {
  const validTypes = [
    "goal",
    "reminder",
    "post",
    "message",
    "login",
    "logout",
    "signup",
    "friend_request",
    "friend_accept",
    "comment",
    "reaction",
    "achievement",
  ];
  if (!validTypes.includes(this.type)) {
    return next(new Error("Invalid activity type"));
  }
  next();
});

// Export the Activity model
const Activity: Model<Activity> = mongoose.model<Activity>("Activity", ActivitySchema);

export default Activity;
