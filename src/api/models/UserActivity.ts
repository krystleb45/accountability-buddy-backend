import type { Document } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the interface for the UserActivity document
export interface IUserActivity extends Document {
  user: mongoose.Types.ObjectId; // Reference to the user who performed the activity
  activityType: string; // Type of activity (e.g., "login", "update_profile")
  details: string; // Additional details about the activity
  createdAt: Date; // Automatically set timestamp for when the activity occurred
}

// Define the schema for UserActivity
const UserActivitySchema: Schema = new Schema<IUserActivity>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    activityType: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Automatically add `createdAt` but not `updatedAt`
  },
);

// Create and export the UserActivity model
const UserActivity = mongoose.model<IUserActivity>(
  "UserActivity",
  UserActivitySchema,
);
export default UserActivity;
