// src/api/models/Milestone.ts
import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Milestone Document Interface ---
export interface IMilestone extends Document {
  title: string;
  description: string;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isPastDue(): boolean;
}

// --- Milestone Model Interface ---
export interface IMilestoneModel extends Model<IMilestone> {
  findUpcoming(daysAhead?: number): Promise<IMilestone[]>;
  findOverdue(): Promise<IMilestone[]>;
}

// --- Schema Definition ---
const MilestoneSchema = new Schema<IMilestone, IMilestoneModel>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// --- Indexes ---
MilestoneSchema.index({ dueDate: 1 });

// --- Instance Methods ---
MilestoneSchema.methods.isPastDue = function (this: IMilestone): boolean {
  return this.dueDate.getTime() < Date.now();
};

// --- Static Methods ---
/**
 * Find milestones due within the next `daysAhead` days (default 7)
 */
MilestoneSchema.statics.findUpcoming = function (
  this: IMilestoneModel,
  daysAhead = 7
): Promise<IMilestone[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return this.find({ dueDate: { $gte: now, $lte: cutoff } })
    .sort({ dueDate: 1 })
    .exec();
};

/**
 * Find milestones that are overdue
 */
MilestoneSchema.statics.findOverdue = function (
  this: IMilestoneModel
): Promise<IMilestone[]> {
  return this.find({ dueDate: { $lt: new Date() } })
    .sort({ dueDate: 1 })
    .exec();
};

// --- Model Export ---
export const Milestone = mongoose.model<IMilestone, IMilestoneModel>(
  "Milestone",
  MilestoneSchema
);
export default Milestone;
