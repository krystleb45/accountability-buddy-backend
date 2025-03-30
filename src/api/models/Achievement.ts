import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// ✅ Define Achievement Interface
export interface IAchievement extends Document {
  name: string;
  description: string;
  requirements: number; // Number of completed tasks required
  badgeUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ✅ Define Achievement Schema
const AchievementSchema: Schema<IAchievement> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Achievement name is required"],
      trim: true,
      unique: true, // Prevent duplicate achievement names
      maxlength: [100, "Achievement name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Achievement description is required"],
      trim: true,
      maxlength: [500, "Achievement description cannot exceed 500 characters"],
    },
    requirements: {
      type: Number,
      required: [true, "Achievement must have a requirement"],
      min: [1, "Requirements must be at least 1"],
    },
    badgeUrl: {
      type: String,
      trim: true,
      default: "/default-badge.png", // ✅ Added a default placeholder badge
    },
  },
  {
    timestamps: true, // ✅ Auto-created `createdAt` and `updatedAt`
  }
);

// ✅ Indexing for performance optimization
AchievementSchema.index({ name: 1 }); // Faster lookup by name
AchievementSchema.index({ requirements: 1 }); // Optimize queries by requirements

// ✅ Export Model
const Achievement: Model<IAchievement> = mongoose.model<IAchievement>(
  "Achievement",
  AchievementSchema
);

export default Achievement;
