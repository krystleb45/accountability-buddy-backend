// src/api/models/Task.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Task Document Interface ---
export interface ITask extends Document {
  user: Types.ObjectId;
  title: string;
  description?: string;
  status: "not-started" | "in-progress" | "completed" | "archived";
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  markComplete(): Promise<ITask>;
  archive(): Promise<ITask>;
  postpone(days: number): Promise<ITask>;
}

// --- Task Model Static Interface ---
export interface ITaskModel extends Model<ITask> {
  getByUser(userId: Types.ObjectId, status?: string): Promise<ITask[]>;
  getOverdue(): Promise<ITask[]>;
  getUpcoming(days: number): Promise<ITask[]>;
}

// --- Schema Definition ---
const TaskSchema = new Schema<ITask, ITaskModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [100, "Task title cannot exceed 100 characters"]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Task description cannot exceed 500 characters"]
    },
    status: {
      type: String,
      enum: ["not-started", "in-progress", "completed", "archived"],
      default: "not-started"
    },
    dueDate: { type: Date },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

// --- Pre-save Hook ---
TaskSchema.pre<ITask>("save", function (next) {
  if (this.isModified("status") && this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// --- Instance Methods ---
TaskSchema.methods.markComplete = async function (this: ITask): Promise<ITask> {
  this.status = "completed";
  this.completedAt = new Date();
  return this.save();
};

TaskSchema.methods.archive = async function (this: ITask): Promise<ITask> {
  this.status = "archived";
  return this.save();
};

TaskSchema.methods.postpone = async function (
  this: ITask,
  days: number
): Promise<ITask> {
  const now = new Date();
  const base = this.dueDate && this.dueDate > now ? this.dueDate : now;
  this.dueDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return this.save();
};

// --- Static Methods ---
TaskSchema.statics.getByUser = function (
  this: ITaskModel,
  userId: Types.ObjectId,
  status?: string
): Promise<ITask[]> {
  const filter: any = { user: userId };
  if (status) filter.status = status;
  return this.find(filter).sort({ dueDate: 1 }).exec();
};

TaskSchema.statics.getOverdue = function (this: ITaskModel): Promise<ITask[]> {
  const now = new Date();
  return this.find({
    dueDate: { $lt: now },
    status: { $in: ["not-started", "in-progress"] }
  })
    .sort({ dueDate: 1 })
    .exec();
};

TaskSchema.statics.getUpcoming = function (
  this: ITaskModel,
  days: number
): Promise<ITask[]> {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return this.find({
    dueDate: { $gte: now, $lte: future },
    status: { $in: ["not-started", "in-progress"] }
  })
    .sort({ dueDate: 1 })
    .exec();
};

// --- Explicit Indexes ---
TaskSchema.index({ user: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ dueDate: 1 });

// --- Model Export ---
export const Task = mongoose.model<ITask, ITaskModel>("Task", TaskSchema);
export default Task;
