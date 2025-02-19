import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define badge levels and types
export type BadgeLevel = "Bronze" | "Silver" | "Gold";
export type BadgeType =
  | "goal_completed"
  | "helper"
  | "milestone_achiever"
  | "consistency_master"
  | "time_based"
  | "event_badge";

// Badge interface
export interface IBadge extends Document {
  user: mongoose.Types.ObjectId;
  badgeType: BadgeType;
  description?: string;
  level: BadgeLevel;
  progress: number;
  goal: number;
  dateAwarded: Date;
  expiresAt?: Date;
  isShowcased: boolean;
  event?: string;
  pointsRewarded: number;
}

// Badge model interface
export interface BadgeModel extends Model<IBadge> {
  getNextLevel(currentLevel: BadgeLevel): BadgeLevel;
  isExpired(expiresAt?: Date): boolean;
  awardPointsForBadge(badgeType: BadgeType): number;
}

// Define Badge schema
const BadgeSchema = new Schema<IBadge, BadgeModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    badgeType: {
      type: String,
      enum: [
        "goal_completed",
        "helper",
        "milestone_achiever",
        "consistency_master",
        "time_based",
        "event_badge",
      ],
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    level: {
      type: String,
      enum: ["Bronze", "Silver", "Gold"],
      default: "Bronze",
    },
    progress: {
      type: Number,
      default: 0,
    },
    goal: {
      type: Number,
      default: 1,
    },
    dateAwarded: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    isShowcased: {
      type: Boolean,
      default: false,
    },
    event: {
      type: String,
      default: "",
    },
    pointsRewarded: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Static method: Get the next badge level
BadgeSchema.statics.getNextLevel = function (
  currentLevel: BadgeLevel,
): BadgeLevel {
  const levels: BadgeLevel[] = ["Bronze", "Silver", "Gold"];
  const currentIndex = levels.indexOf(currentLevel);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : currentLevel;
};

// Static method: Check if badge is expired
BadgeSchema.statics.isExpired = function (expiresAt?: Date): boolean {
  return !!expiresAt && expiresAt < new Date();
};

// Static method: Award points for badges
BadgeSchema.statics.awardPointsForBadge = function (
  badgeType: BadgeType,
): number {
  const pointsMapping: Record<BadgeType, number> = {
    goal_completed: 50,
    helper: 30,
    milestone_achiever: 100,
    consistency_master: 75,
    time_based: 40,
    event_badge: 20,
  };
  return pointsMapping[badgeType] || 0;
};

// Pre-save hook: Validate progress and handle level up
BadgeSchema.pre<IBadge>("save", function (next) {
  if (this.progress >= this.goal) {
    const nextLevel = (this.constructor as BadgeModel).getNextLevel(this.level);
    if (nextLevel) {
      this.level = nextLevel; // Assign the next level
      this.progress = 0; // Reset progress after leveling up
    }
  }
  next();
});

import logger from "../utils/winstonLogger"; // Replace this path with the correct logger utility

// Post-save hook: Log badge creation or updates
BadgeSchema.post<IBadge>("save", function (doc) {
  logger.info(
    `Badge ${doc.badgeType} at ${doc.level} level awarded to user ${doc.user}`,
  );
});


// Export the Badge model
const Badge = mongoose.model<IBadge, BadgeModel>("Badge", BadgeSchema);
export default Badge;
