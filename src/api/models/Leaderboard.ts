import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Interface for Leaderboard Document
export interface ILeaderboard extends Document {
  user: mongoose.Types.ObjectId;
  completedGoals: number;
  completedMilestones: number;
  totalPoints: number;
  streakDays: number;
  rank: number | null;
  rankDescription: string; // Virtual field, don't include in schema directly
}

// ✅ Define static methods for the Leaderboard Model
interface ILeaderboardModel extends Model<ILeaderboard> {
  updateLeaderboard(
    userId: mongoose.Types.ObjectId,
    points: number,
    goals: number,
    milestones: number,
    streak: number
  ): Promise<ILeaderboard | null>;

  recalculateRanks(): Promise<void>;
}

// Schema Definition
const LeaderboardSchema = new Schema<ILeaderboard>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Ensure one entry per user
      index: true, // Optimize user-based queries
    },
    completedGoals: {
      type: Number,
      default: 0,
      min: [0, "Completed goals cannot be negative"],
    },
    completedMilestones: {
      type: Number,
      default: 0,
      min: [0, "Completed milestones cannot be negative"],
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: [0, "Total points cannot be negative"],
    },
    streakDays: {
      type: Number,
      default: 0,
      min: [0, "Streak days cannot be negative"],
    },
    rank: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for sorting leaderboard
LeaderboardSchema.index(
  {
    totalPoints: -1,
    completedGoals: -1,
    completedMilestones: -1,
    streakDays: -1,
  },
  { name: "leaderboard_sort_index" }
); // Compound index for leaderboard sorting

// ✅ Define Static Method: Update Leaderboard Entry
LeaderboardSchema.statics.updateLeaderboard = async function (
  userId: mongoose.Types.ObjectId,
  points: number,
  goals: number,
  milestones: number,
  streak: number
): Promise<ILeaderboard | null> {
  const leaderboardEntry = await this.findOneAndUpdate(
    { user: userId },
    {
      $inc: {
        totalPoints: points,
        completedGoals: goals,
        completedMilestones: milestones,
        streakDays: streak,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // ✅ Ensure Rank Updates
  await (this as ILeaderboardModel).recalculateRanks(); // Cast `this` to `ILeaderboardModel`
  return leaderboardEntry;
};

// ✅ Define Static Method: Recalculate Ranks
LeaderboardSchema.statics.recalculateRanks = async function (): Promise<void> {
  const leaderboardEntries = await this.find()
    .sort({
      totalPoints: -1,
      completedGoals: -1,
      completedMilestones: -1,
      streakDays: -1,
    })
    .exec();

  for (let i = 0; i < leaderboardEntries.length; i++) {
    leaderboardEntries[i].rank = i + 1;
    await leaderboardEntries[i].save();
  }
};

// ✅ Virtual Field: Rank Description
LeaderboardSchema.virtual("rankDescription").get(function (): string {
  switch (this.rank) {
    case 1:
      return "Champion";
    case 2:
      return "Runner-up";
    case 3:
      return "Third Place";
    default:
      return `Rank ${this.rank}`;
  }
});

// ✅ Ensure TypeScript Recognizes Static Methods
const Leaderboard = mongoose.model<ILeaderboard, ILeaderboardModel>(
  "Leaderboard",
  LeaderboardSchema
);

export default Leaderboard;
