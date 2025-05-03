// src/api/models/Level.ts
import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Reward Subdocument ---
export interface IReward {
  rewardType: "badge" | "discount" | "customization";
  rewardValue: string;
  achievedAt: Date;
}

// --- Level Document Interface ---
export interface ILevel extends Document {
  user: Types.ObjectId;
  points: number;
  level: number;
  nextLevelAt: number;
  rewards: Types.DocumentArray<IReward>;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  totalRewards: number;

  // Instance methods
  addReward(
    rewardType: IReward["rewardType"],
    rewardValue: string
  ): Promise<ILevel>;
}

// --- Level Model Interface ---
export interface ILevelModel extends Model<ILevel> {
  addPoints(userId: Types.ObjectId, points: number): Promise<ILevel>;
  getTopLevels(limit: number): Promise<ILevel[]>;
}

// --- Sub-schemas ---
const RewardSchema = new Schema<IReward>(
  {
    rewardType: {
      type: String,
      enum: ["badge", "discount", "customization"],
      required: true,
    },
    rewardValue: { type: String, required: true, trim: true },
    achievedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// --- Main Schema ---
const LevelSchema = new Schema<ILevel, ILevelModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    points: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    nextLevelAt: { type: Number, default: 100, min: 1 },
    rewards: { type: [RewardSchema], default: [] },
    lastActivity: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
LevelSchema.index({ user: 1 }, { unique: true });
LevelSchema.index({ level: -1, points: -1 });
LevelSchema.index({ lastActivity: -1 });

// --- Pre-save Hook for Level-up Logic ---
LevelSchema.pre<ILevel>("save", function (next): void {
  while (this.points >= this.nextLevelAt) {
    this.points -= this.nextLevelAt;
    this.level += 1;
    this.nextLevelAt = Math.floor(this.nextLevelAt * 1.2);
  }
  next();
});

// --- Static Methods ---
LevelSchema.statics.addPoints = async function (
  this: ILevelModel,
  userId: Types.ObjectId,
  points: number
): Promise<ILevel> {
  let lvl = await this.findOne({ user: userId });
  if (!lvl) {
    lvl = await this.create({ user: userId, points });
  } else {
    lvl.points += points;
    lvl.lastActivity = new Date();
    await lvl.save();
  }
  return lvl;
};

LevelSchema.statics.getTopLevels = function (
  this: ILevelModel,
  limit: number
): Promise<ILevel[]> {
  return this.find()
    .sort({ level: -1, points: -1 })
    .limit(limit)
    .populate("user", "username profilePicture");
};

// --- Virtuals ---
LevelSchema.virtual("totalRewards").get(function (this: ILevel): number {
  return this.rewards.length;
});

// --- Instance Methods ---
LevelSchema.methods.addReward = async function (
  this: ILevel,
  rewardType: IReward["rewardType"],
  rewardValue: string
): Promise<ILevel> {
  this.rewards.push({ rewardType, rewardValue, achievedAt: new Date() });
  await this.save();
  return this;
};

// --- Model Export ---
export const Level = mongoose.model<ILevel, ILevelModel>(
  "Level",
  LevelSchema
);

export default Level;
