import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Interface for Leaderboard Document ---
export interface ILeaderboard extends Document {
  user: Types.ObjectId;
  completedGoals: number;
  completedMilestones: number;
  totalPoints: number;
  streakDays: number;
  rank: number | null;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  rankDescription: string;
}

// --- Model Interface for Statics ---
export interface ILeaderboardModel extends Model<ILeaderboard> {
  updateLeaderboard(
    userId: Types.ObjectId,
    points: number,
    goals: number,
    milestones: number,
    streak: number
  ): Promise<ILeaderboard>;
  recalculateRanks(): Promise<void>;
  getTop(n: number): Promise<ILeaderboard[]>;
}

// --- Schema Definition ---
const LeaderboardSchema = new Schema<ILeaderboard, ILeaderboardModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    completedGoals: { type: Number, default: 0, min: 0 },
    completedMilestones: { type: Number, default: 0, min: 0 },
    totalPoints: { type: Number, default: 0, min: 0 },
    streakDays: { type: Number, default: 0, min: 0 },
    rank: { type: Number, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Compound Index for Sorting ---
LeaderboardSchema.index(
  {
    totalPoints: -1,
    completedGoals: -1,
    completedMilestones: -1,
    streakDays: -1,
  },
  { name: "leaderboard_sort_index" }
);

// --- Static Methods ---
LeaderboardSchema.statics.updateLeaderboard = async function (
  userId: Types.ObjectId,
  points: number,
  goals: number,
  milestones: number,
  streak: number
): Promise<ILeaderboard> {
  const entry = await this.findOneAndUpdate(
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
  await this.recalculateRanks();
  return entry!;
};

LeaderboardSchema.statics.recalculateRanks = async function (): Promise<void> {
  const entries = await this.find()
    .sort({
      totalPoints: -1,
      completedGoals: -1,
      completedMilestones: -1,
      streakDays: -1,
    })
    .exec();
  for (let i = 0; i < entries.length; i++) {
    entries[i].rank = i + 1;
    await entries[i].save();
  }
};

LeaderboardSchema.statics.getTop = function (n: number): Promise<ILeaderboard[]> {
  return this.find()
    .sort({ totalPoints: -1, completedGoals: -1, completedMilestones: -1, streakDays: -1 })
    .limit(n);
};

// --- Virtual Field ---
LeaderboardSchema.virtual("rankDescription").get(function (this: ILeaderboard): string {
  switch (this.rank) {
    case 1:
      return "Champion";
    case 2:
      return "Runner-up";
    case 3:
      return "Third Place";
    default:
      return this.rank ? `Rank ${this.rank}` : "Unranked";
  }
});

// --- Model Export ---
export const Leaderboard = mongoose.model<ILeaderboard, ILeaderboardModel>(
  "Leaderboard",
  LeaderboardSchema
);

export default Leaderboard;
