import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import { logger } from "../utils/winstonLogger";

// ✅ Define Badge Levels & Types
export type BadgeLevel = "Bronze" | "Silver" | "Gold";
export type BadgeType =
  | "goal_completed"
  | "helper"
  | "milestone_achiever"
  | "consistency_master"
  | "time_based"
  | "event_badge";

// ✅ BadgeProgress Interface
export interface IBadgeProgress extends Document {
  user: mongoose.Types.ObjectId;
  badgeType: BadgeType;
  progress: number;
  goal: number;
  lastUpdated: Date;
  milestoneAchieved: boolean;
  level: BadgeLevel;
}

// ✅ Define BadgeProgress Schema (WITHOUT STATIC METHODS)
const BadgeProgressSchema = new Schema<IBadgeProgress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // ✅ Optimize queries
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
      index: true, // ✅ Optimize searches by badge type
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
  }
);

// ✅ Index for Faster Queries
BadgeProgressSchema.index({ user: 1, badgeType: 1 }, { unique: true });

// ✅ Define BadgeProgress Model Interface
export interface BadgeProgressModel extends Model<IBadgeProgress> {
  updateProgress(userId: mongoose.Types.ObjectId, badgeType: BadgeType, increment: number): Promise<IBadgeProgress>;
  getRemainingProgress(progress: number, goal: number): number;
  resetProgress(userId: mongoose.Types.ObjectId, badgeType: BadgeType): Promise<IBadgeProgress | null>;
  upgradeBadgeLevel(userId: mongoose.Types.ObjectId, badgeType: BadgeType): Promise<IBadgeProgress | null>;
}

// ✅ Attach Static Methods AFTER Schema Definition

// Update Progress
BadgeProgressSchema.statics.updateProgress = async function (
  userId: mongoose.Types.ObjectId,
  badgeType: BadgeType,
  increment: number
): Promise<IBadgeProgress> {
  const progress = await this.findOne({ user: userId, badgeType });
  if (!progress) throw new Error("Badge progress not found");

  progress.progress += increment;

  // ✅ If goal reached, set milestone
  if (progress.progress >= progress.goal) {
    progress.progress = progress.goal;
    progress.milestoneAchieved = true;
  }

  progress.lastUpdated = new Date();
  await progress.save();
  return progress;
};

// Get Remaining Progress
BadgeProgressSchema.statics.getRemainingProgress = function (progress: number, goal: number): number {
  return Math.max(goal - progress, 0);
};

// Reset Progress
BadgeProgressSchema.statics.resetProgress = async function (
  userId: mongoose.Types.ObjectId,
  badgeType: BadgeType
): Promise<IBadgeProgress | null> {
  const progress = await this.findOne({ user: userId, badgeType });
  if (!progress) return null;

  progress.progress = 0;
  progress.milestoneAchieved = false;
  progress.lastUpdated = new Date();
  await progress.save();
  return progress;
};

// Upgrade Badge Level
BadgeProgressSchema.statics.upgradeBadgeLevel = async function (
  userId: mongoose.Types.ObjectId,
  badgeType: BadgeType
): Promise<IBadgeProgress | null> {
  const progress = await this.findOne({ user: userId, badgeType });
  if (!progress) return null;

  const levels: BadgeLevel[] = ["Bronze", "Silver", "Gold"];
  const currentLevelIndex = levels.indexOf(progress.level);

  if (currentLevelIndex < levels.length - 1) {
    progress.level = levels[currentLevelIndex + 1]; // ✅ Move to next level
    progress.progress = 0; // ✅ Reset progress
    progress.goal *= 2; // ✅ Increase difficulty
    progress.milestoneAchieved = false;
    progress.lastUpdated = new Date();

    await progress.save();
  }
  return progress;
};

// ✅ Pre-save Hook: Validate Progress
BadgeProgressSchema.pre<IBadgeProgress>("save", function (next) {
  if (this.progress > this.goal) {
    this.progress = this.goal; // ✅ Cap progress at the goal
  }
  next();
});

// ✅ Post-save Hook: Log Badge Progress Updates
BadgeProgressSchema.post<IBadgeProgress>("save", function (doc) {
  logger.info({
    message: "Badge progress updated",
    badgeType: doc.badgeType,
    user: doc.user.toString(),
    level: doc.level,
    progress: `${doc.progress}/${doc.goal}`,
  });
});

// ✅ Create & Export BadgeProgress Model
const BadgeProgress = mongoose.model<IBadgeProgress, BadgeProgressModel>("BadgeProgress", BadgeProgressSchema);
export default BadgeProgress;
