// src/api/services/GoalAnalyticsService.ts
import mongoose from "mongoose";
import GoalAnalytics, { IGoalAnalytics } from "../models/GoalAnalytics";
import { createError } from "../middleware/errorHandler";

class GoalAnalyticsService {
  /** Fetch analytics for a given user */
  static async getByUser(userId: string): Promise<IGoalAnalytics[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    return GoalAnalytics.find({ user: userId }).exec();
  }

  /** Fetch all analytics (admin) */
  static async getAll(): Promise<IGoalAnalytics[]> {
    return GoalAnalytics.find().exec();
  }

  /** Fetch analytics for one goal */
  static async getByGoal(goalId: string): Promise<IGoalAnalytics | null> {
    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      throw createError("Invalid goal ID", 400);
    }
    return GoalAnalytics.findOne({ goal: goalId }).exec();
  }

  /** Update analytics document for one goal */
  static async update(
    goalId: string,
    updates: Partial<IGoalAnalytics>
  ): Promise<IGoalAnalytics | null> {
    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      throw createError("Invalid goal ID", 400);
    }
    return GoalAnalytics.findOneAndUpdate(
      { goal: goalId },
      updates,
      { new: true, runValidators: true }
    )
      .lean<IGoalAnalytics>()
      .exec();
  }

  /** Delete analytics for one goal */
  static async delete(goalId: string): Promise<IGoalAnalytics | null> {
    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      throw createError("Invalid goal ID", 400);
    }
    return GoalAnalytics.findOneAndDelete({ goal: goalId })
      .lean<IGoalAnalytics>()
      .exec();
  }

  /**
   * Fetch analytics for a goal within a date range (admin).
   * Returns all matching analytics entries whose `recordedAt` falls between startDate and endDate.
   */
  static async getByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<IGoalAnalytics[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    const start = new Date(startDate);
    const end   = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw createError("Invalid date format", 400);
    }
    return GoalAnalytics.find({
      user: userId,
      recordedAt: { $gte: start, $lte: end },
    }).exec();
  }
}

export default GoalAnalyticsService;
