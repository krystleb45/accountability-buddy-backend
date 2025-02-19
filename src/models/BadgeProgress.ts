import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define Badge Level and Type enums
export type BadgeLevel = "Bronze" | "Silver" | "Gold";
export type BadgeType =
  | "goal_completed"
  | "helper"
  | "milestone_achiever"
  | "consistency_master"
  | "time_based"
  | "event_badge";

// BadgeProgress interface
export interface IBadgeProgress extends Document {
  user: mongoose.Types.ObjectId;
  badgeType: BadgeType;
  progress: number;
  goal: number;
  lastUpdated: Date;
  milestoneAchieved: boolean;
  level: BadgeLevel;
}

// BadgeProgress model interface
export interface BadgeProgressModel extends Model<IBadgeProgress> {
  updateProgress(
    userId: mongoose.Types.ObjectId,
    badgeType: BadgeType,
    increment: number
  ): Promise<IBadgeProgress>;
  getRemainingProgress(progress: number, goal: number): number;
  resetProgress(
    userId: mongoose.Types.ObjectId,
    badgeType: BadgeType
  ): Promise<IBadgeProgress | null>;
  upgradeBadgeLevel(
    userId: mongoose.Types.ObjectId,
    badgeType: BadgeType
  ): Promise<IBadgeProgress | null>;
}

// Define the BadgeProgress schema
const BadgeProgressSchema = new Schema<IBadgeProgress, BadgeProgressModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    badgeType: {
      type: String,
      required: true,
      enum: [
        "goal_completed",
        "helper",
        "milestone_achiever",
        "consistency_master",
        "time_based",
        "event_badge",
      ],
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, "Progress cannot be negative"],
    },
    goal: {
      type: Number,
      required: true,
      min: [1, "Goal must be at least 1"],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    milestoneAchieved: {
      type: Boolean,
      default: false,
    },
    level: {
      type: String,
      enum: ["Bronze", "Silver", "Gold"],
      default: "Bronze",
    },
  },
  {
    timestamps: true,
  },
);

// Index to optimize lookup by user and badgeType
BadgeProgressSchema.index({ user: 1, badgeType: 1 }, { unique: true });

// Static method: Update progress
BadgeProgressSchema.statics.updateProgress = async function (
  userId: mongoose.Types.ObjectId,
  badgeType: BadgeType,
  increment: number,
): Promise<IBadgeProgress> {
  const progress = await this.findOne({ user: userId, badgeType });
  if (!progress) {
    throw new Error("Badge progress not found");
  }

  progress.progress += increment;

  // Check if the goal has been reached
  if (progress.progress >= progress.goal) {
    progress.progress = progress.goal;
    progress.milestoneAchieved = true;
  }

  progress.lastUpdated = new Date();

  await progress.save();
  return progress;
};

// Static method: Calculate remaining progress
BadgeProgressSchema.statics.getRemainingProgress = function (
  progress: number,
  goal: number,
): number {
  return Math.max(goal - progress, 0);
};

// Static method: Reset progress
BadgeProgressSchema.statics.resetProgress = async function (
  userId: mongoose.Types.ObjectId,
  badgeType: BadgeType,
): Promise<IBadgeProgress | null> {
  const progress = await this.findOne({ user: userId, badgeType });
  if (!progress) return null;

  progress.progress = 0;
  progress.milestoneAchieved = false;
  progress.lastUpdated = new Date();

  await progress.save();
  return progress;
};

// Static method: Upgrade badge level
BadgeProgressSchema.statics.upgradeBadgeLevel = async function (
  userId: mongoose.Types.ObjectId,
  badgeType: BadgeType,
): Promise<IBadgeProgress | null> {
  const progress = await this.findOne({ user: userId, badgeType });
  if (!progress) return null;

  const levels: BadgeLevel[] = ["Bronze", "Silver", "Gold"];
  const currentLevelIndex = levels.indexOf(progress.level);

  if (currentLevelIndex < levels.length - 1) {
    progress.level = levels[currentLevelIndex + 1];
    progress.progress = 0; // Reset progress for the new level
    progress.goal *= 2; // Example: Double the goal for the next level
    progress.milestoneAchieved = false;
    progress.lastUpdated = new Date();

    await progress.save();
  }

  return progress;
};

// Pre-save hook: Validate progress
BadgeProgressSchema.pre<IBadgeProgress>("save", function (next) {
  if (this.progress > this.goal) {
    this.progress = this.goal; // Cap progress at the goal
  }
  next();
});

import logger from "../utils/winstonLogger"; // Adjust the path to your logger utility

// Post-save hook: Log updates
BadgeProgressSchema.post<IBadgeProgress>("save", function (doc) {
  logger.info({
    message: "Badge progress updated",
    badgeType: doc.badgeType,
    user: doc.user.toString(),
    level: doc.level,
    progress: `${doc.progress}/${doc.goal}`,
  });
});


// Export the model
const BadgeProgress = mongoose.model<IBadgeProgress, BadgeProgressModel>(
  "BadgeProgress",
  BadgeProgressSchema,
);

export default BadgeProgress;
