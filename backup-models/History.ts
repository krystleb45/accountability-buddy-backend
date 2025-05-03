// src/api/models/History.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Interface for History Document ---
export interface IHistory extends Document {
  entity: string;         // E.g., "User", "Goal", "Task", etc.
  action: string;         // E.g., "Created", "Updated", "Deleted"
  details?: string;       // Additional information about the action
  user?: Types.ObjectId;  // Optional: user who performed the action
  createdAt: Date;        // Auto-generated
  updatedAt: Date;        // Auto-generated

  // Instance methods
  toSummary(): string;
}

// --- Model Interface for Statics ---
export interface IHistoryModel extends Model<IHistory> {
  record(
    entity: string,
    action: string,
    details?: string,
    userId?: Types.ObjectId
  ): Promise<IHistory>;
  getForEntity(entity: string, limit?: number): Promise<IHistory[]>;
}

// --- Schema Definition ---
const HistorySchema = new Schema<IHistory, IHistoryModel>(
  {
    entity: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String, default: "" },
    user: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,  // Adds createdAt & updatedAt
    toJSON: { virtuals: false },
    toObject: { virtuals: false }
  }
);

// --- Indexes ---
HistorySchema.index({ entity: 1, createdAt: -1 });
HistorySchema.index({ user: 1 });

// --- Instance Methods ---
HistorySchema.methods.toSummary = function (this: IHistory): string {
  const userPart = this.user ? ` by user ${this.user}` : "";
  const detailsPart = this.details ? `: ${this.details}` : "";
  return `[${this.createdAt.toISOString()}] ${this.entity} ${this.action}${userPart}${detailsPart}`;
};

// --- Static Methods ---
HistorySchema.statics.record = function (
  this: IHistoryModel,
  entity: string,
  action: string,
  details = "",
  userId?: Types.ObjectId
): Promise<IHistory> {
  return this.create({ entity, action, details, user: userId });
};

HistorySchema.statics.getForEntity = function (
  this: IHistoryModel,
  entity: string,
  limit = 50
): Promise<IHistory[]> {
  return this.find({ entity })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user", "username")
    .exec();
};

// --- Model Export ---
export const History = mongoose.model<IHistory, IHistoryModel>(
  "History",
  HistorySchema
);

export default History;
