// src/api/models/CollaborationGoal.ts
import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Subdocument Interface ---
export interface ICollabMilestone {
  title: string;
  dueDate: Date;
  completed: boolean;
}

// --- Main Interface ---
export interface ICollaborationGoal extends Document {
  goalTitle: string;
  description: string;
  createdBy: Types.ObjectId;
  participants: Types.ObjectId[];
  target: number;
  progress: number;
  status: "pending" | "in-progress" | "completed" | "canceled";
  completedAt?: Date;
  milestones: Types.DocumentArray<ICollabMilestone>;
  visibility: "public" | "private";
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  participantCount: number;
  milestoneCount: number;
  completedMilestonesCount: number;

  // Instance methods
  updateProgress(newProgress: number): Promise<ICollaborationGoal>;
  addParticipant(userId: Types.ObjectId): Promise<ICollaborationGoal>;
  completeMilestone(index: number): Promise<ICollaborationGoal>;
}

// --- Model Interface ---
export interface ICollaborationGoalModel extends Model<ICollaborationGoal> {
  fetchByVisibility(vis: "public" | "private", limit?: number): Promise<ICollaborationGoal[]>;
}

// --- Schema Definition ---
const CollabMilestoneSchema = new Schema<ICollabMilestone>(
  {
    title:     { type: String, required: true, trim: true, maxlength: 100 },
    dueDate:   { type: Date,   required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false }
);

const CollaborationGoalSchema = new Schema<ICollaborationGoal, ICollaborationGoalModel>(
  {
    goalTitle:   { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    createdBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    participants:{ type: [Schema.Types.ObjectId], ref: "User", default: [] },
    target:      { type: Number, required: true, min: 1 },
    progress:    { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "canceled"],
      default: "pending",
    },
    completedAt: { type: Date },
    milestones:  { type: [CollabMilestoneSchema], default: [] },
    visibility:  {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// --- Indexes ---
CollaborationGoalSchema.index({ goalTitle: 1 });
CollaborationGoalSchema.index({ createdBy: 1, status: 1 });    // compound index
CollaborationGoalSchema.index({ visibility: 1 });

// --- Virtuals ---
CollaborationGoalSchema.virtual("participantCount").get(function (this: ICollaborationGoal): number {
  return this.participants.length;
});
CollaborationGoalSchema.virtual("milestoneCount").get(function (this: ICollaborationGoal): number {
  return this.milestones.length;
});
CollaborationGoalSchema.virtual("completedMilestonesCount").get(function (this: ICollaborationGoal): number {
  return this.milestones.filter(m => m.completed).length;
});

// --- Middleware ---
// Ensure creator is always in participants
CollaborationGoalSchema.pre<ICollaborationGoal>("save", function (next) {
  if (!this.participants.includes(this.createdBy)) {
    this.participants.push(this.createdBy);
  }
  next();
});

// --- Instance Methods ---
CollaborationGoalSchema.methods.updateProgress = async function (
  this: ICollaborationGoal,
  newProgress: number
): Promise<ICollaborationGoal> {
  this.progress = Math.min(this.progress + newProgress, this.target);
  if (this.progress < this.target) {
    this.status = "in-progress";  // <-- use ASCII hyphen here
  } else {
    this.status = "completed";
  }
  await this.save();
  return this;
};

CollaborationGoalSchema.methods.addParticipant = async function (
  this: ICollaborationGoal,
  userId: Types.ObjectId
): Promise<ICollaborationGoal> {
  if (!this.participants.some(id => id.equals(userId))) {
    this.participants.push(userId);
    await this.save();
  }
  return this;
};

CollaborationGoalSchema.methods.completeMilestone = async function (
  this: ICollaborationGoal,
  index: number
): Promise<ICollaborationGoal> {
  const ms = this.milestones[index];
  if (!ms) throw new Error("Milestone not found");
  ms.completed = true;
  await this.save();
  return this;
};

// --- Static Methods ---
CollaborationGoalSchema.statics.fetchByVisibility = function (
  visibility: "public" | "private",
  limit = 20
): Promise<ICollaborationGoal[]> {
  return this.find({ visibility })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("createdBy", "username email");
};

// --- Model Export ---
export const CollaborationGoal = mongoose.model<ICollaborationGoal, ICollaborationGoalModel>(
  "CollaborationGoal",
  CollaborationGoalSchema
);
export default CollaborationGoal;
