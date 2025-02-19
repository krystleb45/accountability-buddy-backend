import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define Reward interface
interface IReward {
  rewardType: "badge" | "discount" | "customization";
  rewardValue: string;
  achievedAt: Date;
}

// Define Level document interface
export interface ILevel extends Document {
  user: Types.ObjectId;
  points: number;
  level: number;
  nextLevelAt: number;
  rewards: IReward[];
  lastActivity: Date;
  addReward: (rewardType: "badge" | "discount" | "customization", rewardValue: string) => Promise<void>;
}

// Extend Level model interface for statics
interface ILevelModel extends Model<ILevel> {
  addPoints: (userId: Types.ObjectId, points: number) => Promise<ILevel>;
}

// Define Level schema
const LevelSchema = new Schema<ILevel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Each user should have only one level entry
    },
    points: {
      type: Number,
      default: 0, // Points accumulate over time
      min: [0, "Points cannot be negative"], // Ensure no negative points
    },
    level: {
      type: Number,
      default: 1, // Initial user level
      min: [1, "Level cannot be less than 1"], // Ensure level starts at 1
    },
    nextLevelAt: {
      type: Number,
      default: 100, // Points needed for the next level
    },
    rewards: [
      {
        rewardType: {
          type: String,
          enum: ["badge", "discount", "customization"], // Example reward types
          required: true,
        },
        rewardValue: {
          type: String, // Value associated with the reward (e.g., badge ID, discount code)
          trim: true,
        },
        achievedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastActivity: {
      type: Date,
      default: Date.now, // When the user last gained points or engaged in an activity
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt timestamps
  },
);

// Pre-save hook to calculate level-up logic
LevelSchema.pre<ILevel>("save", function (next) {
  // Handle leveling up
  while (this.points >= this.nextLevelAt) {
    this.level += 1;
    this.points -= this.nextLevelAt; // Deduct points for leveling up
    this.nextLevelAt = Math.floor(this.nextLevelAt * 1.2); // Scale-up points needed for the next level
  }

  next();
});

// Static method to add points and handle leveling up
LevelSchema.statics.addPoints = async function (
  userId: Types.ObjectId,
  points: number,
): Promise<ILevel> {
  let userLevel = await this.findOne({ user: userId });

  // Create a level record if the user doesn't have one
  if (!userLevel) {
    userLevel = await this.create({ user: userId, points });
  } else {
    userLevel.points += points;
    userLevel.lastActivity = new Date();
    await userLevel.save();
  }

  return userLevel;
};

// Virtual field to get total rewards earned by the user
LevelSchema.virtual("totalRewards").get(function () {
  return this.rewards.length;
});

// Instance method to add a reward
LevelSchema.methods.addReward = async function (
  rewardType: "badge" | "discount" | "customization",
  rewardValue: string,
): Promise<void> {
  this.rewards.push({ rewardType, rewardValue, achievedAt: new Date() });
  await this.save();
};

// Indexes for optimized queries
LevelSchema.index({ user: 1 });
LevelSchema.index({ points: -1 });
LevelSchema.index({ lastActivity: -1 });

// Export the Level model
export const Level: ILevelModel = mongoose.model<ILevel, ILevelModel>(
  "Level",
  LevelSchema,
);

export default Level;
