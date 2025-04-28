import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import { logger } from "../../utils/winstonLogger";

// --- Types & Interfaces ---
export type BadgeLevel = "Bronze" | "Silver" | "Gold";
export type BadgeType =
  | "goal_completed"
  | "helper"
  | "milestone_achiever"
  | "consistency_master"
  | "time_based"
  | "event_badge";

export interface IBadge extends Document {
  user: Types.ObjectId;
  badgeType: BadgeType;
  description: string;
  level: BadgeLevel;
  progress: number;
  goal: number;
  dateAwarded: Date;
  expiresAt?: Date;
  isShowcased: boolean;
  event?: string;
  pointsRewarded: number;
  badgeIconUrl?: string;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isExpired: boolean;

  // Instance methods
  updateProgress(amount: number): Promise<IBadge>;
}

export interface IBadgeModel extends Model<IBadge> {
  getNextLevel(currentLevel: BadgeLevel): BadgeLevel;
  isExpired(expiresAt?: Date): boolean;
  awardPointsForBadge(badgeType: BadgeType): number;
}

// --- Schema Definition ---
const BadgeSchema = new Schema<IBadge>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
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
      index: true,
    },
    description: { type: String, default: "", trim: true },
    level: { type: String, enum: ["Bronze","Silver","Gold"], default: "Bronze" },
    progress: { type: Number, default: 0 },
    goal: { type: Number, default: 1 },
    dateAwarded: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    isShowcased: { type: Boolean, default: false },
    event: { type: String, default: "", trim: true },
    pointsRewarded: { type: Number, default: 0 },
    badgeIconUrl: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
BadgeSchema.index({ user: 1, badgeType: 1, level: 1 });

// --- Virtuals ---
BadgeSchema.virtual("isExpired").get(function (this: IBadge): boolean {
  return Boolean(this.expiresAt && this.expiresAt < new Date());
});

// --- Instance Methods ---
BadgeSchema.methods.updateProgress = async function (
  this: IBadge,
  amount: number
): Promise<IBadge> {
  this.progress += amount;
  if (this.progress >= this.goal) {
    this.level = (this.constructor as IBadgeModel).getNextLevel(this.level);
    this.progress = 0;
    this.dateAwarded = new Date();
    this.pointsRewarded += (this.constructor as IBadgeModel).awardPointsForBadge(this.badgeType);
  }
  await this.save();
  return this;
};

// --- Static Methods ---
BadgeSchema.statics.getNextLevel = function (
  currentLevel: BadgeLevel
): BadgeLevel {
  const levels: BadgeLevel[] = ["Bronze","Silver","Gold"];
  const idx = levels.indexOf(currentLevel);
  return levels[idx + 1] || currentLevel;
};

BadgeSchema.statics.isExpired = function (
  expiresAt?: Date
): boolean {
  return Boolean(expiresAt && expiresAt < new Date());
};

BadgeSchema.statics.awardPointsForBadge = function (
  badgeType: BadgeType
): number {
  const mapping: Record<BadgeType, number> = {
    goal_completed: 50,
    helper: 30,
    milestone_achiever: 100,
    consistency_master: 75,
    time_based: 40,
    event_badge: 20,
  };
  return mapping[badgeType] || 0;
};

// --- Hooks ---
BadgeSchema.pre<IBadge>("save", function (next: (err?: Error) => void): void {
  if (this.progress < 0) {
    return next(new Error("Progress cannot be negative"));
  }
  next();
});

BadgeSchema.post<IBadge>("save", function (doc: IBadge): void {
  try {
    logger.info(`Badge ${doc.badgeType} (${doc.level}) recorded for user ${doc.user.toString()}`);
  } catch (err) {
    logger.error(`Badge post-save error: ${(err as Error).message}`);
  }
});

// --- Model Export ---
export const Badge = mongoose.model<IBadge, IBadgeModel>("Badge", BadgeSchema);
export default Badge;
