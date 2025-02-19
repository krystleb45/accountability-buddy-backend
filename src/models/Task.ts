import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface ITask extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: "not-started" | "in-progress" | "completed" | "archived";
  dueDate?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the schema
const TaskSchema: Schema<ITask> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for faster queries by user
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [100, "Task title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Task description cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: ["not-started", "in-progress", "completed", "archived"],
      default: "not-started",
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

// Pre-save hook to handle status changes
TaskSchema.pre<ITask>("save", function (next) {
  if (this.isModified("status") && this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Export the model
const Task: Model<ITask> = mongoose.model<ITask>("Task", TaskSchema);
export default Task;
