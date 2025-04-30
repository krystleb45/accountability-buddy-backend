// src/api/services/goalMessageService.ts
import mongoose from "mongoose";
import { GoalMessage, IGoalMessage } from "../models/GoalMessage";
import Goal from "../models/Goal";
import { createError } from "../middleware/errorHandler";

export type PopulatedMsg = {
  _id: string;
  user: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  goal: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
};

class GoalMessageService {
  /**
   * Create a new message on a goal, verifying the goal belongs to the user.
   */
  static async create(
    goalId: string,
    userId: string,
    text: string
  ): Promise<IGoalMessage> {
    if (!mongoose.isValidObjectId(goalId) || !mongoose.isValidObjectId(userId)) {
      throw createError("Invalid goal or user ID", 400);
    }
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      throw createError("Goal not found or access denied", 404);
    }
    const doc = await GoalMessage.create({
      goal: goalId,
      user: userId,
      message: text.trim(),
    });
    return doc.toObject();
  }

  /**
   * Fetch all messages for a given goal (no ownership check).
   */
  static async listByGoal(goalId: string): Promise<PopulatedMsg[]> {
    if (!mongoose.isValidObjectId(goalId)) {
      throw createError("Invalid goal ID", 400);
    }
    const raw = await GoalMessage.find({ goal: goalId })
      .sort({ createdAt: -1 })
      .populate("user", "username profilePicture")
      .lean();

    return (raw as any[]).map((m) => ({
      _id: String(m._id),
      user: {
        _id: String(m.user._id),
        username: m.user.username,
        profilePicture: m.user.profilePicture,
      },
      goal: String(m.goal),
      message: m.message,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
    }));
  }

  /**
   * Update a single message, ensuring the user is the author.
   */
  static async update(
    messageId: string,
    userId: string,
    newText: string
  ): Promise<IGoalMessage> {
    if (!mongoose.isValidObjectId(messageId)) {
      throw createError("Invalid message ID", 400);
    }
    const msg = await GoalMessage.findOne({ _id: messageId, user: userId });
    if (!msg) {
      throw createError("Message not found or access denied", 404);
    }
    msg.message = newText.trim();
    await msg.save();
    return msg.toObject();
  }

  /**
   * Delete a message, ensuring the user is the author.
   */
  static async delete(
    messageId: string,
    userId: string
  ): Promise<void> {
    if (!mongoose.isValidObjectId(messageId)) {
      throw createError("Invalid message ID", 400);
    }
    const msg = await GoalMessage.findOne({ _id: messageId, user: userId });
    if (!msg) {
      throw createError("Message not found or access denied", 404);
    }
    await msg.deleteOne();
  }
}

export default GoalMessageService;
