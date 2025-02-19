import type { Document, Model, CallbackError } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the Activity interface
export interface Activity extends Document {
  user: mongoose.Types.ObjectId; // Reference to the User model
  type: "goal" | "reminder" | "post" | "message" | "login" | "logout" | "signup"; // Enum of activity types
  description?: string; // Optional activity description
  metadata: Map<string, string>; // Additional metadata as key-value pairs
  createdAt: Date;
  updatedAt: Date;
  activityType: string; // Virtual field for a readable activity type
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
      enum: ["goal", "reminder", "post", "message", "login", "logout", "signup"],
      required: [true, "Activity type is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true, // Automatically create createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Index for optimized queries
ActivitySchema.index({ user: 1, type: 1, createdAt: -1 }); // Compound index for user, type, and createdAt
ActivitySchema.index({ createdAt: -1 }); // Index to optimize sorting by creation date

// Virtual field to get a readable activity type
ActivitySchema.virtual("activityType").get(function (this: Activity) {
  return this.type.charAt(0).toUpperCase() + this.type.slice(1); // Capitalize the activity type
});

// Pre-save hook to ensure type consistency
ActivitySchema.pre("save", function (next: (err?: CallbackError) => void) {
  const validTypes = ["goal", "reminder", "post", "message", "login", "logout", "signup"];
  if (!validTypes.includes(this.type)) {
    return next(new Error("Invalid activity type"));
  }
  next();
});

// Export the Activity model
const Activity: Model<Activity> = mongoose.model<Activity>("Activity", ActivitySchema);

export default Activity;
