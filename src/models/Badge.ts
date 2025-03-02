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

// ✅ Badge Interface
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

// ✅ Define Badge Schema (WITHOUT STATIC METHODS)
const BadgeSchema = new Schema<IBadge>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // ✅ Faster user-based lookups
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
      index: true, // ✅ Optimize searches by badge type
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
      default: 0, // ✅ Set after schema definition
    },
  },
  {
    timestamps: true, // ✅ Automatically adds createdAt & updatedAt
  }
);

// ✅ Badge Model Interface (Defined AFTER Schema)
export interface BadgeModel extends Model<IBadge> {
  getNextLevel(currentLevel: BadgeLevel): BadgeLevel;
  isExpired(expiresAt?: Date): boolean;
  awardPointsForBadge(badgeType: BadgeType): number;
}

// ✅ Attach Static Methods AFTER Schema Definition
BadgeSchema.statics.getNextLevel = function (currentLevel: BadgeLevel): BadgeLevel {
  const levels: BadgeLevel[] = ["Bronze", "Silver", "Gold"];
  const currentIndex = levels.indexOf(currentLevel);
  return levels[currentIndex + 1] || currentLevel; // Keep at Gold if maxed out
};

BadgeSchema.statics.isExpired = function (expiresAt?: Date): boolean {
  return Boolean(expiresAt && expiresAt < new Date());
};

BadgeSchema.statics.awardPointsForBadge = function (badgeType: BadgeType): number {
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

// ✅ Pre-save Hook: Handle Level Up Mechanism
BadgeSchema.pre<IBadge>("save", function (next) {
  if (this.progress >= this.goal) {
    this.level = (Badge as BadgeModel).getNextLevel(this.level);
    this.progress = 0; // ✅ Reset progress after leveling up
  }
  next();
});

// ✅ Post-save Hook: Log Badge Creation or Updates
BadgeSchema.post<IBadge>("save", function (doc) {
  try {
    logger.info(`Badge ${doc.badgeType} (${doc.level}) awarded to user ${doc.user}`);
  } catch (error) {
    logger.error(`Error logging badge: ${(error as Error).message}`);
  }
});

// ✅ Create & Export Badge Model AFTER Schema is Complete
const Badge = mongoose.model<IBadge, BadgeModel>("Badge", BadgeSchema);
export default Badge;
