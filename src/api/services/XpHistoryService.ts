// src/api/services/XpHistoryService.ts

import { Types } from "mongoose";
import XpHistory, { IXpHistory } from "../models/XpHistory";
import { createError } from "../middleware/errorHandler";

class XpHistoryService {
  /**
   * Create a new XP history entry for a user.
   */
  static async createEntry(
    userId: string,
    xp: number,
    reason: string
  ): Promise<IXpHistory> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    if (typeof xp !== "number" || xp <= 0) {
      throw createError("XP must be a positive number", 400);
    }
    if (!reason || typeof reason !== "string") {
      throw createError("Reason is required", 400);
    }

    const entry = await XpHistory.create({
      userId: new Types.ObjectId(userId),
      xp,
      reason,
    } as IXpHistory);
    return entry;
  }

  /**
   * Fetch all XP history entries for a given user.
   */
  static async getUserHistory(userId: string): Promise<IXpHistory[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    return XpHistory.find({ userId: new Types.ObjectId(userId) })
      .sort({ date: -1 })
      .exec();
  }

  /**
   * (Admin) Fetch every XP history entry in the system.
   */
  static async getAllHistory(): Promise<IXpHistory[]> {
    return XpHistory.find().sort({ date: -1 }).exec();
  }
}

export default XpHistoryService;
