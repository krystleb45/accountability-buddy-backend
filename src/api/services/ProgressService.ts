// src/api/services/ProgressService.ts
import { Types } from "mongoose";
import Goal, { IGoal } from "../models/Goal";
import AccountabilityPartnership, {
  IAccountabilityPartnership,
} from "../models/AccountabilityPartnership";
import { createError } from "../middleware/errorHandler";

export interface ProgressDashboard {
  goals: Pick<IGoal,
    "title" | "description" | "dueDate" | "status" | "milestones" | "progress"
  >[];
  partnerships: (IAccountabilityPartnership & {
    user1: { _id: string; username: string; profilePicture?: string };
    user2: { _id: string; username: string; profilePicture?: string };
  })[];
}

class ProgressService {
  /**
   * Fetch dashboard data: goals + partnerships
   */
  static async getDashboard(userId: string): Promise<ProgressDashboard> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }

    const [goals, rawPartnerships] = await Promise.all([
      Goal.find({ user: userId })
        .select("title description dueDate status milestones progress")
        .sort({ createdAt: -1 })
        .lean(),

      AccountabilityPartnership.find({
        $or: [{ user1: userId }, { user2: userId }],
      })
        .populate("user1", "username profilePicture")
        .populate("user2", "username profilePicture")
        .select("-__v")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Cast the populated lean result into our expected shape
    const partnerships = rawPartnerships as unknown as ProgressDashboard["partnerships"];

    return { goals, partnerships };
  }

  /**
   * Fetch a user's goal progress summary.
   */
  static async getProgress(userId: string): Promise<Pick<IGoal, "title" | "progress" | "status" | "dueDate">[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    return Goal.find({ user: userId })
      .select("title progress status dueDate")
      .sort({ updatedAt: -1 })
      .lean();
  }

  /**
   * Update the `progress` field of a single goal.
   */
  static async updateProgress(
    userId: string,
    goalId: string,
    newProgress: number
  ): Promise<IGoal> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(goalId)) {
      throw createError("Invalid user or goal ID", 400);
    }
    if (newProgress < 0 || newProgress > 100) {
      throw createError("Progress must be between 0 and 100", 400);
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: goalId, user: userId },
      { progress: newProgress },
      { new: true, runValidators: true }
    );
    if (!goal) {
      throw createError("Goal not found or access denied", 404);
    }
    return goal;
  }

  /**
   * Reset all goals' progress to 0 for a given user.
   */
  static async resetProgress(
    userId: string
  ): Promise<{ modifiedCount: number }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    const result = await Goal.updateMany(
      { user: userId },
      { progress: 0 }
    );
    return { modifiedCount: result.modifiedCount };
  }
}

export default ProgressService;
