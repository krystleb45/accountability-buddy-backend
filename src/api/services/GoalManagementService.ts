// src/api/services/GoalManagementService.ts
import mongoose from "mongoose";
import Goal, { IGoal } from "../models/Goal";
import { User } from "../models/User";
import { CustomError } from "./errorHandler";
import { logger } from "../../utils/winstonLogger";

type NewGoalData = {
  title: string;
  description?: string;
  target?: number;
  category?: string;
};

class GoalManagementService {
  /**
   * Fetch all public (non-archived) goals.
   */
  static async getPublicGoals(): Promise<IGoal[]> {
    const goals = await Goal.find({ status: { $ne: "archived" } })
      .sort({ createdAt: -1 })
      .exec();
    logger.info(`Fetched ${goals.length} public goals`);
    return goals;
  }

  /**
   * Fetch all goals for a given user.
   */
  static async getUserGoals(userId: string): Promise<IGoal[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new CustomError("Invalid user ID", 400);
    }
    const goals = await Goal.find({ user: userId }).sort({ createdAt: -1 }).exec();
    logger.info(`Fetched ${goals.length} goals for user ${userId}`);
    return goals;
  }

  /**
   * Get streak dates for a user's completed goals (YYYY-MM-DD).
   */
  static async getStreakDates(userId: string): Promise<string[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new CustomError("Invalid user ID", 400);
    }
    const completed = await Goal.find({
      user: userId,
      status: "completed",
      completedAt: { $exists: true },
    })
      .select("completedAt")
      .exec();

    const dates = completed
      .map((g) => g.completedAt!.toISOString().slice(0, 10))
      .sort();
    logger.info(`Streak dates for user ${userId}: [${dates.join(", ")}]`);
    return dates;
  }

  /**
   * Track progress on a goal; if ≥100, mark complete.
   */
  static async trackProgress(
    goalId: string,
    userId: string,
    progress: number
  ): Promise<IGoal> {
    if (!mongoose.Types.ObjectId.isValid(goalId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new CustomError("Invalid goal or user ID", 400);
    }
    const goal = await Goal.findById(goalId);
    if (!goal) {
      throw new CustomError("Goal not found", 404);
    }
    if (goal.user.toString() !== userId) {
      throw new CustomError("Not authorized to update this goal", 403);
    }

    goal.progress = Math.min(100, Math.max(0, progress));
    if (goal.progress >= 100) {
      goal.status = "completed";
      goal.completedAt = new Date();
    }
    await goal.save();
    logger.info(
      `User ${userId} updated progress of goal ${goalId} to ${goal.progress}%`
    );
    return goal;
  }

  /**
   * Mark a goal fully complete.
   */
  static async completeGoal(goalId: string, userId: string): Promise<IGoal> {
    if (!mongoose.Types.ObjectId.isValid(goalId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new CustomError("Invalid goal or user ID", 400);
    }
    const goal = await Goal.findById(goalId);
    if (!goal) {
      throw new CustomError("Goal not found", 404);
    }
    if (goal.user.toString() !== userId) {
      throw new CustomError("Not authorized to complete this goal", 403);
    }

    goal.progress = 100;
    goal.status = "completed";
    goal.completedAt = new Date();
    await goal.save();
    logger.info(`User ${userId} completed goal ${goalId}`);
    return goal;
  }

  /**
   * Create a new goal.
   */
  static async createGoal(
    userId: string,
    data: NewGoalData
  ): Promise<IGoal> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new CustomError("Invalid user ID", 400);
    }
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    const goal = new Goal({
      user: userId,
      title: data.title,
      description: data.category ?? data.description,
      target: data.target,
      progress: 0,
      status: "not-started",
      milestones: [],
      tags: [],
      priority: "medium",
      isPinned: false,
      points: 0,
      dueDate: undefined,
      completedAt: undefined,
    });

    await goal.save();
    logger.info(`Goal created for user ${userId}: ${goal._id}`);
    return goal;
  }
}

export default GoalManagementService;
