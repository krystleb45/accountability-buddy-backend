import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Reminder interface
export interface IReminder {
  message: string;
  remindAt: Date;
}

// Milestone interface
export interface IMilestone {
  title: string;
  deadline: Date;
  completed: boolean;
}

// Goal interface
export interface IGoal extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: "not-started" | "in-progress" | "completed" | "archived";
  progress: number;
  dueDate?: Date;
  completedAt?: Date;
  milestones: IMilestone[];
  tags: string[];
  priority: "high" | "medium" | "low";
  reminders?: IReminder[]; // Added reminders field
}

// Define the schema
const GoalSchema: Schema<IGoal> = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [255, "Title cannot exceed 255 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["not-started", "in-progress", "completed", "archived"],
      default: "not-started",
    },
    progress: {
      type: Number,
      min: [0, "Progress cannot be less than 0"],
      max: [100, "Progress cannot exceed 100"],
      default: 0,
      validate: {
        validator: (value: number) => value >= 0 && value <= 100,
        message: "Progress must be between 0 and 100.",
      },
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
    milestones: [
      {
        title: { type: String, required: [true, "Milestone title is required"], trim: true },
        deadline: {
          type: Date,
          required: [true, "Milestone deadline is required"],
          validate: {
            validator: (value: Date) => value > new Date(),
            message: "Milestone deadline must be in the future.",
          },
        },
        completed: { type: Boolean, default: false },
      },
    ],
    tags: { type: [String], default: [] },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    reminders: [
      {
        message: {
          type: String,
          required: [true, "Reminder message is required"],
          trim: true,
        },
        remindAt: {
          type: Date,
          required: [true, "Reminder time is required"],
          validate: {
            validator: (value: Date) => value > new Date(),
            message: "Reminder time must be in the future.",
          },
        },
      },
    ], // Added reminders schema
  },
  { timestamps: true },
);

// Pre-save hook to handle status changes
GoalSchema.pre<IGoal>("save", function (next) {
  try {
    if (this.isModified("status") && this.status === "completed") {
      this.completedAt = new Date();
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Export the Goal model
const Goal: Model<IGoal> = mongoose.model<IGoal>("Goal", GoalSchema);
export default Goal;
