import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Interface for the Leaderboard document
export interface ILeaderboard extends Document {
  user: mongoose.Types.ObjectId;
  completedGoals: number;
  completedMilestones: number;
  totalPoints: number;
  rank: number | null;
  rankDescription: string; // Virtual field
}

// Schema definition
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
      min: [0, "Completed goals cannot be negative"], // Prevent negative values
    },
    completedMilestones: {
      type: Number,
      default: 0,
      min: [0, "Completed milestones cannot be negative"], // Prevent negative values
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: [0, "Total points cannot be negative"], // Prevent negative values
    },
    rank: {
      type: Number,
      default: null, // Rank will be computed later
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound index for efficient leaderboard sorting
LeaderboardSchema.index({
  totalPoints: -1,
  completedGoals: -1,
  completedMilestones: -1,
});

// Static method to update leaderboard entry
LeaderboardSchema.statics.updateLeaderboard = async function (
  userId: mongoose.Types.ObjectId,
  points: number,
  goals: number,
  milestones: number,
): Promise<ILeaderboard | null> {
  return await this.findOneAndUpdate(
    { user: userId },
    {
      $inc: {
        totalPoints: points,
        completedGoals: goals,
        completedMilestones: milestones,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }, // Create a new entry if it doesn't exist
  );
};

// Static method to recalculate ranks
LeaderboardSchema.statics.recalculateRanks = async function (): Promise<void> {
  const leaderboardEntries = await this.find()
    .sort({
      totalPoints: -1,
      completedGoals: -1,
      completedMilestones: -1,
    })
    .exec();

  for (let i = 0; i < leaderboardEntries.length; i++) {
    leaderboardEntries[i].rank = i + 1;
    await leaderboardEntries[i].save();
  }
};

// Virtual field for rank description
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

// Pre-save hook to validate leaderboard data
LeaderboardSchema.pre<ILeaderboard>("save", function (next): void {
  const minimumPoints =
    this.completedGoals * 10 + this.completedMilestones * 5; // Example calculation logic
  if (this.totalPoints < minimumPoints) {
    return next(
      new Error(
        "Total points cannot be less than the sum of completed goals and milestones",
      ),
    );
  }
  next();
});

// Export the Leaderboard model
export const Leaderboard: Model<ILeaderboard> = mongoose.model<ILeaderboard>(
  "Leaderboard",
  LeaderboardSchema,
);

export default Leaderboard;
