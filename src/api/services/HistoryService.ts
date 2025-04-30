// src/api/services/historyService.ts
import mongoose from "mongoose";
import History, { IHistory } from "../models/History";
import { createError } from "../middleware/errorHandler";

class HistoryService {
  /** Fetch all history records for a user */
  static async getAll(userId: string): Promise<IHistory[]> {
    if (!mongoose.isValidObjectId(userId)) {
      throw createError("Invalid user ID", 400);
    }
    return History.find({ userId }).sort({ createdAt: -1 });
  }

  /** Fetch a single history record by its ID */
  static async getById(id: string): Promise<IHistory> {
    if (!mongoose.isValidObjectId(id)) {
      throw createError("Invalid history ID format", 400);
    }
    const record = await History.findById(id);
    if (!record) {
      throw createError("History record not found", 404);
    }
    return record;
  }

  /** Create a new history record */
  static async create(
    userId: string,
    entity: string,
    action: string,
    details?: string
  ): Promise<IHistory> {
    if (!mongoose.isValidObjectId(userId)) {
      throw createError("Invalid user ID", 400);
    }
    if (!entity || !action) {
      throw createError("Entity and action are required", 400);
    }
    const newRecord = new History({
      userId,
      entity,
      action,
      details,
      createdAt: new Date(),
    });
    return newRecord.save();
  }

  /** Delete one history record by its ID */
  static async deleteById(id: string): Promise<void> {
    if (!mongoose.isValidObjectId(id)) {
      throw createError("Invalid history ID format", 400);
    }
    const deleted = await History.findByIdAndDelete(id);
    if (!deleted) {
      throw createError("History record not found", 404);
    }
  }

  /** Clear all history for a given user */
  static async clearAll(userId: string): Promise<{ deletedCount: number }> {
    if (!mongoose.isValidObjectId(userId)) {
      throw createError("Invalid user ID", 400);
    }
    const result = await History.deleteMany({ userId });
    return { deletedCount: result.deletedCount ?? 0 };
  }
}

export default HistoryService;
