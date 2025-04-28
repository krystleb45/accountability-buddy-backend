import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Interface ---
export interface IGoalAnalytics extends Document {
  user: Types.ObjectId;                    // Reference to the user
  goal: Types.ObjectId;                    // Reference to the goal
  totalTasks: number;                      // Total number of tasks in the goal
  completedTasks: number;                  // Number of tasks completed
  completionRate: number;                  // Completion rate (percentage)
  averageTaskCompletionTime?: number;      // Average time taken to complete tasks (hours)
  streak: number;                          // Current streak of days with progress
  bestStreak: number;                      // Best consecutive-day streak
  lastUpdated: Date;                       // Last streak update time
  createdAt: Date;                         // Auto-set by timestamps
  updatedAt: Date;                         // Auto-set by timestamps

  // Instance methods
  isStreakActive(): boolean;
}

// --- Model Interface ---
export interface IGoalAnalyticsModel extends Model<IGoalAnalytics> {
  updateStreak(goalId: Types.ObjectId): Promise<IGoalAnalytics>;
  recordTaskCompletion(
    goalId: Types.ObjectId,
    completionTimeHours: number
  ): Promise<IGoalAnalytics>;
}

// --- Schema Definition ---
const GoalAnalyticsSchema = new Schema<IGoalAnalytics>(
  {
    user:    { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    goal:    { type: Schema.Types.ObjectId, ref: "Goal", required: true, index: true },
    totalTasks:           { type: Number, default: 0, min: 0 },
    completedTasks:       { type: Number, default: 0, min: 0 },
    completionRate:       { type: Number, default: 0, min: 0, max: 100 },
    averageTaskCompletionTime: { type: Number, default: null },
    streak:               { type: Number, default: 0, min: 0 },
    bestStreak:           { type: Number, default: 0, min: 0 },
    lastUpdated:          { type: Date, default: Date.now }
  },
  {
    timestamps: true,    // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// --- Indexes ---
GoalAnalyticsSchema.index({ user: 1, goal: 1 }, { unique: true });

// --- Pre-save Hook: calculate completionRate ---
GoalAnalyticsSchema.pre<IGoalAnalytics>("save", function (next) {
  if (this.totalTasks > 0) {
    this.completionRate = (this.completedTasks / this.totalTasks) * 100;
  } else {
    this.completionRate = 0;
  }
  next();
});

// --- Instance Methods ---
GoalAnalyticsSchema.methods.isStreakActive = function (this: IGoalAnalytics): boolean {
  // Active streak if last update was within 24h
  return (Date.now() - this.lastUpdated.getTime()) <= 24 * 60 * 60 * 1000;
};

// --- Static Methods ---
/**
 * Update daily streak based on lastUpdated
 */
GoalAnalyticsSchema.statics.updateStreak = async function (
  goalId: Types.ObjectId
): Promise<IGoalAnalytics> {
  const analytics = await this.findOne({ goal: goalId });
  if (!analytics) throw new Error("Goal analytics not found");

  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const diff = now.getTime() - analytics.lastUpdated.getTime();

  if (diff <= oneDayMs) {
    analytics.streak += 1;
    if (analytics.streak > analytics.bestStreak) {
      analytics.bestStreak = analytics.streak;
    }
  } else {
    analytics.streak = 1;
  }
  analytics.lastUpdated = now;
  return analytics.save();
};

/**
 * Record a completed task: increment counts and update average time
 */
GoalAnalyticsSchema.statics.recordTaskCompletion = async function (
  goalId: Types.ObjectId,
  completionTimeHours: number
): Promise<IGoalAnalytics> {
  const analytics = await this.findOne({ goal: goalId });
  if (!analytics) throw new Error("Goal analytics not found");

  analytics.totalTasks += 1;
  analytics.completedTasks += 1;

  // Update averageTaskCompletionTime
  const prevAvg = analytics.averageTaskCompletionTime ?? 0;
  analytics.averageTaskCompletionTime =
    ((prevAvg * (analytics.completedTasks - 1)) + completionTimeHours) / analytics.completedTasks;

  // Save will trigger pre-save to recalculate completionRate
  return analytics.save();
};

// --- Model Export ---
export const GoalAnalytics = mongoose.model<IGoalAnalytics, IGoalAnalyticsModel>(
  "GoalAnalytics",
  GoalAnalyticsSchema
);

export default GoalAnalytics;
