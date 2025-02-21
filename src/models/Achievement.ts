import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface IAchievement extends Document {
  name: string;
  description: string;
  requirements: number; // ✅ Added requirements field
  badgeUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AchievementSchema: Schema<IAchievement> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Achievement name is required"],
      trim: true,
      maxlength: [100, "Achievement name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Achievement description is required"],
      maxlength: [500, "Achievement description cannot exceed 500 characters"],
    },
    requirements: {
      type: Number,
      required: true, // ✅ Ensures achievements have a requirement
      min: [1, "Requirements must be at least 1"],
    },
    badgeUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const Achievement: Model<IAchievement> = mongoose.model<IAchievement>(
  "Achievement",
  AchievementSchema
);

export default Achievement;
