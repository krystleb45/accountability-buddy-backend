import type { IGoal } from "../models/Goal";
import Goal from "../models/Goal"; // Import the Goal model and interface
import User from "../models/User"; // Import the User model
import logger from "../utils/winstonLogger"; // Logging utility
import { CustomError } from "./errorHandler"; // Centralized error handling
import type { FilterQuery } from "mongoose";

const GoalManagementService = {
  /**
   * Create a new goal for a user.
   * @param userId - The ID of the user creating the goal.
   * @param goalData - The goal details.
   * @returns The newly created goal document.
   */
  async createGoal(userId: string, goalData: Partial<IGoal>): Promise<IGoal> {
    try {
      const user = await User.findById(userId);
      if (!user) throw new CustomError("User not found", 404);

      const goal = new Goal({
        ...goalData,
        user: userId,
      });

      await goal.save();
      logger.info(`Goal created successfully for user ID: ${userId}`);
      return goal;
    } catch (error) {
      logger.error("Error creating goal:", error);
      throw new CustomError("Failed to create goal", 500);
    }
  },

  /**
   * Retrieve a goal by its ID.
   * @param goalId - The ID of the goal.
   * @returns The goal document if found.
   */
  async getGoalById(goalId: string): Promise<IGoal | null> {
    try {
      const goal = await Goal.findById(goalId).populate("user", "username email");
      if (!goal) throw new CustomError("Goal not found", 404);

      logger.info(`Goal retrieved successfully: ${goalId}`);
      return goal;
    } catch (error) {
      logger.error("Error retrieving goal:", error);
      throw new CustomError("Failed to retrieve goal", 500);
    }
  },

  /**
   * Update a goal by its ID.
   * @param goalId - The ID of the goal to update.
   * @param updates - The fields to update.
   * @returns The updated goal document.
   */
  async updateGoal(goalId: string, updates: Partial<IGoal>): Promise<IGoal | null> {
    try {
      const goal = await Goal.findByIdAndUpdate(goalId, updates, {
        new: true, // Return the updated document
        runValidators: true, // Validate fields before saving
      });

      if (!goal) throw new CustomError("Goal not found", 404);

      logger.info(`Goal updated successfully: ${goalId}`);
      return goal;
    } catch (error) {
      logger.error("Error updating goal:", error);
      throw new CustomError("Failed to update goal", 500);
    }
  },

  /**
   * Delete a goal by its ID.
   * @param goalId - The ID of the goal to delete.
   * @returns A success message.
   */
  async deleteGoal(goalId: string): Promise<string> {
    try {
      const goal = await Goal.findByIdAndDelete(goalId);
      if (!goal) throw new CustomError("Goal not found", 404);

      logger.info(`Goal deleted successfully: ${goalId}`);
      return "Goal deleted successfully.";
    } catch (error) {
      logger.error("Error deleting goal:", error);
      throw new CustomError("Failed to delete goal", 500);
    }
  },

  /**
   * Track progress for a goal.
   * @param goalId - The ID of the goal.
   * @param progress - The progress value to update.
   * @returns The updated goal document.
   */
  async trackProgress(goalId: string, progress: number): Promise<IGoal | null> {
    try {
      const goal = await Goal.findById(goalId);
      if (!goal) throw new CustomError("Goal not found", 404);

      goal.progress = Math.min(100, Math.max(0, progress)); // Ensure progress is between 0 and 100
      await goal.save();

      logger.info(`Progress updated for goal ID: ${goalId}`);
      return goal;
    } catch (error) {
      logger.error("Error tracking progress:", error);
      throw new CustomError("Failed to track progress", 500);
    }
  },

  /**
   * Retrieve all goals for a user.
   * @param userId - The ID of the user.
   * @param filters - Additional filters for querying goals.
   * @returns A list of goal documents.
   */
  async getUserGoals(
    userId: string,
    filters: FilterQuery<IGoal> = {},
  ): Promise<IGoal[]> {
    try {
      const goals = await Goal.find({ user: userId, ...filters }).sort({ createdAt: -1 });
  
      logger.info(`Fetched ${goals.length} goals for user ID: ${userId}`);
      return goals;
    } catch (error) {
      logger.error("Error fetching user goals:", error);
      throw new CustomError("Failed to fetch user goals", 500);
    }
  },
};

export default GoalManagementService;
