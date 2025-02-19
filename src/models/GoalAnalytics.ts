import type { Document, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the interface for GoalAnalytics
export interface IGoalAnalytics extends Document {
  user: Types.ObjectId; // Reference to the user
  goal: Types.ObjectId; // Reference to the goal
  totalTasks: number; // Total number of tasks in the goal
  completedTasks: number; // Number of tasks completed
  completionRate: number; // Completion rate (percentage)
  averageTaskCompletionTime?: number; // Average time taken to complete tasks (in hours)
  streak: number; // Current streak of consecutive days of progress
  bestStreak: number; // Best streak of consecutive days of progress
  lastUpdated: Date; // Last updated timestamp
}

// Define the schema for GoalAnalytics
const GoalAnalyticsSchema = new Schema<IGoalAnalytics>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    goal: {
      type: Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
    },
    totalTasks: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Total tasks cannot be negative"],
    },
    completedTasks: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Completed tasks cannot be negative"],
    },
    completionRate: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Completion rate cannot be negative"],
      max: [100, "Completion rate cannot exceed 100"],
    },
    averageTaskCompletionTime: {
      type: Number,
      default: null, // Can be null if not calculated
    },
    streak: {
      type: Number,
      default: 0,
      min: [0, "Streak cannot be negative"],
    },
    bestStreak: {
      type: Number,
      default: 0,
      min: [0, "Best streak cannot be negative"],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  },
);

// Pre-save middleware to calculate the completion rate
GoalAnalyticsSchema.pre<IGoalAnalytics>("save", function (next) {
  try {
    if (this.totalTasks > 0) {
      this.completionRate = (this.completedTasks / this.totalTasks) * 100;
    } else {
      this.completionRate = 0;
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Static method to calculate streaks
GoalAnalyticsSchema.statics.updateStreak = async function (
  goalId: Types.ObjectId,
): Promise<void> {
  const analytics = await this.findOne({ goal: goalId });
  if (!analytics) {
    throw new Error("Goal analytics not found");
  }

  const now = new Date();
  const lastUpdatedDate = analytics.lastUpdated;
  const oneDay = 24 * 60 * 60 * 1000;

  if (now.getTime() - lastUpdatedDate.getTime() <= oneDay) {
    analytics.streak += 1;
    if (analytics.streak > analytics.bestStreak) {
      analytics.bestStreak = analytics.streak;
    }
  } else {
    analytics.streak = 1; // Reset the streak
  }

  analytics.lastUpdated = now;
  await analytics.save();
};

// Export the model
const GoalAnalytics = mongoose.model<IGoalAnalytics>("GoalAnalytics", GoalAnalyticsSchema);

export default GoalAnalytics;
