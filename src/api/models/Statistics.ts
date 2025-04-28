import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Statistics Document Interface ---
export interface IStatistics extends Document {
  user: Types.ObjectId;
  goalsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  weeklyActivity: Record<string, number>; // e.g., { Monday: 2, Tuesday: 0, ... }
  lastUpdated: Date;

  // Instance methods
  recordGoalCompletion(): Promise<IStatistics>;
  recordActivity(day: string, count?: number): Promise<IStatistics>;
  addPoints(points: number): Promise<IStatistics>;
}

// --- Statistics Model Static Interface ---
export interface IStatisticsModel extends Model<IStatistics> {
  getByUser(userId: Types.ObjectId): Promise<IStatistics | null>;
  initializeForUser(userId: Types.ObjectId): Promise<IStatistics>;
  resetWeeklyActivity(userId: Types.ObjectId): Promise<IStatistics | null>;
}

// --- Schema Definition ---
const StatisticsSchema = new Schema<IStatistics, IStatisticsModel, IStatistics>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    goalsCompleted: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    weeklyActivity: {
      type: Map,
      of: Number,
      default: (): Record<string, number> => ({
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
        Saturday: 0,
        Sunday: 0,
      }),
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// --- Indexes ---
StatisticsSchema.index({ user: 1 });

// --- Instance Methods ---
// Record a completed goal: increment goalsCompleted, update streaks
StatisticsSchema.methods.recordGoalCompletion = async function (
  this: IStatistics
): Promise<IStatistics> {
  this.goalsCompleted += 1;
  // update streak logic
  this.currentStreak += 1;
  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }
  this.lastUpdated = new Date();
  return this.save();
};

// Record activity for a given day
StatisticsSchema.methods.recordActivity = async function (
  this: IStatistics,
  day: string,
  count = 1
): Promise<IStatistics> {
  const current = this.weeklyActivity[day] || 0;
  this.weeklyActivity[day] = current + count;
  this.lastUpdated = new Date();
  // convert Map to plain object if needed
  this.markModified("weeklyActivity");
  return this.save();
};

// Add points to totalPoints
StatisticsSchema.methods.addPoints = async function (
  this: IStatistics,
  points: number
): Promise<IStatistics> {
  this.totalPoints += points;
  this.lastUpdated = new Date();
  return this.save();
};

// --- Static Methods ---
// Get or find one by user
StatisticsSchema.statics.getByUser = function (
  this: IStatisticsModel,
  userId: Types.ObjectId
): Promise<IStatistics | null> {
  return this.findOne({ user: userId }).exec();
};

// Initialize stats document for new user
StatisticsSchema.statics.initializeForUser = async function (
  this: IStatisticsModel,
  userId: Types.ObjectId
): Promise<IStatistics> {
  let stats = await this.findOne({ user: userId }).exec();
  if (!stats) {
    stats = await this.create({ user: userId });
  }
  return stats;
};

// Reset weekly activity back to zeros
StatisticsSchema.statics.resetWeeklyActivity = async function (
  this: IStatisticsModel,
  userId: Types.ObjectId
): Promise<IStatistics | null> {
  const stats = await this.findOne({ user: userId }).exec();
  if (!stats) return null;
  const resetMap: Record<string, number> = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0,
  };
  stats.weeklyActivity = resetMap as any;
  stats.lastUpdated = new Date();
  stats.markModified("weeklyActivity");
  return stats.save();
};

// --- Model Export ---
export const Statistics = mongoose.model<IStatistics, IStatisticsModel>(
  "Statistics",
  StatisticsSchema
);

export default Statistics;
