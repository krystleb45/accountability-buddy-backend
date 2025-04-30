// src/api/services/MilestoneService.ts
import mongoose from "mongoose";
import Milestone, { IMilestone } from "../models/Milestone";
import { createError } from "../middleware/errorHandler";
import LoggingService from "./LoggingService";

type UpdatableFields = "title" | "description" | "dueDate";

class MilestoneService {
  /**
   * Fetch all milestones for a given user.
   */
  static async listByUser(userId: string): Promise<IMilestone[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    const milestones = await Milestone.find({ user: userId }).sort({ createdAt: -1 });
    void LoggingService.logInfo(`Fetched ${milestones.length} milestones for user ${userId}`);
    return milestones;
  }

  /**
   * Create a new milestone for a user.
   */
  static async add(
    userId: string,
    title: string,
    dueDate: Date,
    description?: string
  ): Promise<IMilestone> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    if (!title.trim()) {
      throw createError("Title is required", 400);
    }
    if (isNaN(dueDate.getTime())) {
      throw createError("Invalid due date", 400);
    }

    const milestone = new Milestone({
      user: userId,
      title: title.trim(),
      description: description?.trim(),
      dueDate,
      createdAt: new Date(),
    });
    await milestone.save();
    void LoggingService.logInfo(`Milestone ${milestone._id} created for user ${userId}`, { title });
    return milestone;
  }

  /**
   * Update an existing milestone (only title, description or dueDate).
   */
  static async update(
    userId: string,
    milestoneId: string,
    updates: Partial<Pick<IMilestone, UpdatableFields>>
  ): Promise<IMilestone> {
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(milestoneId)
    ) {
      throw createError("Invalid ID(s)", 400);
    }

    const milestone = await Milestone.findOne({ _id: milestoneId, user: userId });
    if (!milestone) {
      throw createError("Milestone not found or access denied", 404);
    }

    // Only update the allowed fields if provided
    if (updates.title !== undefined) {
      if (!updates.title.trim()) throw createError("Title cannot be empty", 400);
      milestone.title = updates.title.trim();
    }
    if (updates.description !== undefined) {
      milestone.description = updates.description.trim();
    }
    if (updates.dueDate !== undefined) {
      if (isNaN(updates.dueDate.getTime())) {
        throw createError("Invalid due date", 400);
      }
      milestone.dueDate = updates.dueDate;
    }

    await milestone.save();
    void LoggingService.logInfo(`Milestone ${milestoneId} updated for user ${userId}`, { updates });
    return milestone;
  }

  /**
   * Delete a milestone (only if it belongs to the user).
   */
  static async remove(userId: string, milestoneId: string): Promise<void> {
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(milestoneId)
    ) {
      throw createError("Invalid ID(s)", 400);
    }

    const result = await Milestone.findOneAndDelete({ _id: milestoneId, user: userId });
    if (!result) {
      throw createError("Milestone not found or access denied", 404);
    }
    void LoggingService.logInfo(`Milestone ${milestoneId} deleted for user ${userId}`);
  }
}

export default MilestoneService;
