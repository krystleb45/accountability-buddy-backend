// src/api/models/Achievement.ts

import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Interfaces ---
// Document interface
export interface IAchievement extends Document {
  name: string;
  description: string;
  requirements: number;
  badgeUrl?: string;
  createdAt: Date; // always set by mongoose
  updatedAt: Date; // always set by mongoose

  // Instance helper
  isUnlocked(completed: number): boolean;
}

// Model interface for statics
export interface IAchievementModel extends Model<IAchievement> {
  findByRequirement(min: number): Promise<IAchievement[]>;
}

// --- Schema Definition ---
const AchievementSchema = new Schema<IAchievement>(
  {
    name: {
      type: String,
      required: [true, "Achievement name is required"],
      trim: true,
      unique: true,                                      // creates a unique index on `name`
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
      default: "/default-badge.png",
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// --- Indexes ---
// Only keep index on `requirements`; remove the redundant index on `name`
AchievementSchema.index({ requirements: 1 });

// --- Instance Methods ---
/**
 * Check if the achievement is unlocked given a completed task count
 */
AchievementSchema.methods.isUnlocked = function (completed: number): boolean {
  return completed >= this.requirements;
};

// --- Static Methods ---
/**
 * Retrieve all achievements with requirements >= `min`
 */
AchievementSchema.statics.findByRequirement = function (min: number): Promise<IAchievement[]> {
  return this.find({ requirements: { $gte: min } }).sort({ requirements: 1 }).exec();
};

// --- Model Export ---
export const Achievement = mongoose.model<IAchievement, IAchievementModel>(
  "Achievement",
  AchievementSchema
);

export default Achievement;
