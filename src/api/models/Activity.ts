// src/api/models/Activity.ts
import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the Activity interface
export interface Activity extends Document {
  user: Types.ObjectId;
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
    | "achievement";
  description?: string;
  metadata: Record<string, any>;
  participants: Types.ObjectId[];      // ← newly added
  isDeleted?: boolean;
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
      type: Schema.Types.Mixed,
      default: {},
    },
    participants: {                   // ← newly added
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes and virtuals unchanged...

// Export the Activity model
const Activity: Model<Activity> = mongoose.model<Activity>("Activity", ActivitySchema);

export default Activity;
