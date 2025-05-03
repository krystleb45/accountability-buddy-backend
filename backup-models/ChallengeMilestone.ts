// src/api/models/ChallengeMilestone.ts
import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Interface for Challenge Milestone ---
export interface IChallengeMilestone extends Document {
  challenge: Types.ObjectId;        // Reference to the Challenge
  title: string;                    // Milestone title
  dueDate: Date;                    // When milestone should be completed
  completed: boolean;               // Completion status
  achievedBy: Types.ObjectId[];     // Users who have achieved this milestone
  createdAt: Date;                  // Auto-set by timestamps
  updatedAt: Date;                  // Auto-set by timestamps

  // Instance methods
  markComplete(userId: Types.ObjectId): Promise<IChallengeMilestone>;
  reset(): Promise<IChallengeMilestone>;
}

// --- Model Interface for static methods ---
export interface IChallengeMilestoneModel extends Model<IChallengeMilestone> {
  getByChallenge(challengeId: Types.ObjectId): Promise<IChallengeMilestone[]>;
  getPending(challengeId: Types.ObjectId): Promise<IChallengeMilestone[]>;
}

// --- Schema Definition ---
const ChallengeMilestoneSchema = new Schema<IChallengeMilestone>(
  {
    challenge:    { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    title:        { type: String, required: true, trim: true, maxlength: 200 },
    dueDate:      { type: Date, required: true },
    completed:    { type: Boolean, default: false },
    achievedBy:   [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Compound Index Only ---
ChallengeMilestoneSchema.index({ challenge: 1, dueDate: 1 });

// --- Instance Methods ---
ChallengeMilestoneSchema.methods.markComplete = async function (
  this: IChallengeMilestone,
  userId: Types.ObjectId
): Promise<IChallengeMilestone> {
  if (!this.completed) {
    this.completed = true;
  }
  if (!this.achievedBy.some((id) => id.equals(userId))) {
    this.achievedBy.push(userId);
  }
  await this.save();
  return this;
};

ChallengeMilestoneSchema.methods.reset = async function (
  this: IChallengeMilestone
): Promise<IChallengeMilestone> {
  this.completed = false;
  this.achievedBy = [];
  await this.save();
  return this;
};

// --- Static Methods ---
ChallengeMilestoneSchema.statics.getByChallenge = function (
  challengeId: Types.ObjectId
): Promise<IChallengeMilestone[]> {
  return this.find({ challenge: challengeId }).sort({ dueDate: 1 });
};

ChallengeMilestoneSchema.statics.getPending = function (
  challengeId: Types.ObjectId
): Promise<IChallengeMilestone[]> {
  return this.find({ challenge: challengeId, completed: false }).sort({ dueDate: 1 });
};

// --- Virtuals ---
ChallengeMilestoneSchema.virtual("isOverdue").get(function (this: IChallengeMilestone): boolean {
  return !this.completed && this.dueDate < new Date();
});

// --- Model Export ---
export const ChallengeMilestone = mongoose.model<
  IChallengeMilestone,
  IChallengeMilestoneModel
>("ChallengeMilestone", ChallengeMilestoneSchema);

export default ChallengeMilestone;
