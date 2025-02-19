import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

interface Milestone {
  name: string;
  achieved: boolean;
  achievedAt?: Date;
}

export interface GamificationDocument extends Document {
  userId: Types.ObjectId;
  points: number;
  level: number;
  badges: string[];
  lastActivityDate: Date;
  milestones: Milestone[];
  badgeCount: number; 
  addPoints(points: number): Promise<GamificationDocument>;
  addBadge(badgeName: string): Promise<GamificationDocument>;
  trackMilestone(milestoneName: string): Promise<GamificationDocument>;
}

interface GamificationModel extends Model<GamificationDocument> {
  getLevelThresholds(): number[];
}

const levelThresholds = [0, 100, 300, 600, 1000];

const gamificationSchema = new Schema<GamificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    points: {
      type: Number,
      default: 0,
      min: [0, "Points cannot be negative"],
    },
    level: {
      type: Number,
      default: 1,
      min: [1, "Level cannot be less than 1"],
    },
    badges: [
      {
        type: String,
        trim: true,
      },
    ],
    lastActivityDate: {
      type: Date,
      default: Date.now,
    },
    milestones: [
      {
        name: { type: String, trim: true },
        achieved: { type: Boolean, default: false },
        achievedAt: { type: Date },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Static method for level thresholds
gamificationSchema.statics.getLevelThresholds = function (): number[] {
  return levelThresholds;
};

// Pre-save hook for level-up logic
gamificationSchema.pre<GamificationDocument>("save", function (next) {
  try {
    const currentPoints = this.points;

    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (currentPoints >= levelThresholds[i]) {
        this.level = i + 1;
        break;
      }
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to add points
gamificationSchema.methods.addPoints = async function (
  this: GamificationDocument,
  points: number,
): Promise<GamificationDocument> {
  this.points += points;
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (this.points >= levelThresholds[i]) {
      this.level = i + 1;
      break;
    }
  }

  this.lastActivityDate = new Date();
  await this.save();
  return this;
};

// Method to add a badge
gamificationSchema.methods.addBadge = async function (
  this: GamificationDocument,
  badgeName: string,
): Promise<GamificationDocument> {
  if (!this.badges.includes(badgeName)) {
    this.badges.push(badgeName);
    await this.save();
  }
  return this;
};

// Method to track milestones
gamificationSchema.methods.trackMilestone = async function (
  this: GamificationDocument,
  milestoneName: string,
): Promise<GamificationDocument> {
  const milestone = this.milestones.find((m: Milestone) => m.name === milestoneName);

  if (milestone) {
    milestone.achieved = true;
    milestone.achievedAt = new Date();
  } else {
    this.milestones.push({ name: milestoneName, achieved: true, achievedAt: new Date() });
  }

  await this.save();
  return this;
};

// Virtual for badge count
gamificationSchema.virtual("badgeCount").get(function (this: GamificationDocument): number {
  return this.badges.length;
});

const Gamification = mongoose.model<GamificationDocument, GamificationModel>("Gamification", gamificationSchema);

export default Gamification;
