import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import sanitize from "mongo-sanitize";

// --- Reminder Subdocument ---
export interface IReminder {
  message: string;
  remindAt: Date;
  status: "pending" | "sent";
}

// --- Milestone Subdocument ---
export interface IMilestone {
  title: string;
  deadline: Date;
  completed: boolean;
}

// --- Goal Interface ---
export interface IGoal extends Document {
  user: Types.ObjectId;
  title: string;
  description?: string;
  status: "not-started" | "in-progress" | "completed" | "archived";
  progress: number;
  dueDate?: Date;
  completedAt?: Date;
  milestones: Types.DocumentArray<IMilestone>;
  tags: string[];
  priority: "high" | "medium" | "low";
  reminders: Types.DocumentArray<IReminder>;
  isPinned: boolean;
  points: number;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  milestoneCount: number;
  completedMilestoneCount: number;
  reminderCount: number;

  // Instance methods
  addReminder(message: string, remindAt: Date): Promise<IGoal>;
  markMilestoneComplete(index: number): Promise<IGoal>;
}

// --- Model Interface ---
export interface IGoalModel extends Model<IGoal> {
  findByUser(userId: Types.ObjectId, filter?: Partial<IGoal>): Promise<IGoal[]>;
  archiveCompleted(): Promise<{ nDeleted?: number }>;
}

// --- Sub-schemas ---
const MilestoneSchema = new Schema<IMilestone>(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    deadline: { type: Date, required: true, validate: { validator: (d: Date) => d.getTime() > Date.now(), message: "Deadline must be in the future" } },
    completed: { type: Boolean, default: false }
  },
  { _id: false }
);

const ReminderSchema = new Schema<IReminder>(
  {
    message: { type: String, required: true, trim: true, maxlength: 255 },
    remindAt: { type: Date, required: true, validate: { validator: (d: Date) => d.getTime() > Date.now(), message: "Remind time must be in the future" } },
    status: { type: String, enum: ["pending","sent"], default: "pending" }
  },
  { _id: false }
);

// --- Main Schema ---
const GoalSchema = new Schema<IGoal, IGoalModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 255, index: true },
    description: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ["not-started","in-progress","completed","archived"], default: "not-started", index: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    dueDate: { type: Date, index: true },
    completedAt: { type: Date, index: true },
    milestones: { type: [MilestoneSchema], default: [] },
    tags: { type: [String], default: [], index: true },
    priority: { type: String, enum: ["high","medium","low"], default: "medium", index: true },
    reminders: { type: [ReminderSchema], default: [] },
    isPinned: { type: Boolean, default: false, index: true },
    points: { type: Number, default: 0 }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// --- Indexes ---
GoalSchema.index({ user: 1, status: 1, priority: 1 });

// --- Virtuals ---
GoalSchema.virtual("milestoneCount").get(function (this: IGoal): number {
  return this.milestones.length;
});

GoalSchema.virtual("completedMilestoneCount").get(function (this: IGoal): number {
  return this.milestones.filter(m => m.completed).length;
});

GoalSchema.virtual("reminderCount").get(function (this: IGoal): number {
  return this.reminders.length;
});

// --- Middleware ---
GoalSchema.pre<IGoal>("save", function (next) {
  this.title = sanitize(this.title);
  if (this.description) this.description = sanitize(this.description);
  if (this.isModified("status") && this.status === "completed") {
    this.completedAt = new Date();
  }
  next();
});

// --- Instance Methods ---
GoalSchema.methods.addReminder = async function (this: IGoal, message: string, remindAt: Date): Promise<IGoal> {
  this.reminders.push({ message, remindAt, status: "pending" });
  await this.save();
  return this;
};

GoalSchema.methods.markMilestoneComplete = async function (this: IGoal, index: number): Promise<IGoal> {
  const ms = this.milestones[index];
  if (!ms) throw new Error("Milestone not found");
  ms.completed = true;
  await this.save();
  return this;
};

// --- Static Methods ---
GoalSchema.statics.findByUser = function (this: IGoalModel, userId: Types.ObjectId, filter = {}): Promise<IGoal[]> {
  return this.find({ user: userId, ...filter }).sort({ createdAt: -1 });
};

GoalSchema.statics.archiveCompleted = async function (): Promise<{ nDeleted?: number }> {
  const res = await this.deleteMany({ status: "completed" });
  return { nDeleted: res.deletedCount };
};

// --- Model Export ---
export const Goal = mongoose.model<IGoal, IGoalModel>("Goal", GoalSchema);
export default Goal;
