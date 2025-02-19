import type { Document } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Interface for Tracker document
export interface ITracker extends Document {
  user: mongoose.Types.ObjectId; // Reference to the User model
  name: string;                 // Name of the tracker
  progress: number;             // Progress percentage (0-100)
  createdAt: Date;              // Timestamp for creation
  updatedAt: Date;              // Timestamp for last update
}

// Schema definition
const TrackerSchema: Schema<ITracker> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    name: {
      type: String,
      required: [true, "Tracker name is required"],
      trim: true,
    },
    progress: {
      type: Number,
      required: true,
      default: 0, // Start progress at 0%
      min: [0, "Progress cannot be less than 0"],
      max: [100, "Progress cannot exceed 100"],
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  },
);

// Create and export the model
const Tracker = mongoose.model<ITracker>("Tracker", TrackerSchema);
export default Tracker;
