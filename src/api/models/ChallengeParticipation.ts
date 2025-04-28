import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Interface for Challenge Participation ---
export interface IChallengeParticipation extends Document {
  user: Types.ObjectId;
  challenge: Types.ObjectId;
  joinedAt: Date;
  progress: number;
  completed: boolean;
  createdAt: Date;  // set by timestamps
  updatedAt: Date;  // set by timestamps

  // Virtuals
  progressPercent: number;

  // Instance methods
  updateProgress(amount: number): Promise<IChallengeParticipation>;
  markComplete(): Promise<IChallengeParticipation>;
  resetProgress(): Promise<IChallengeParticipation>;
}

// --- Model interface with static methods ---
export interface IChallengeParticipationModel extends Model<IChallengeParticipation> {
  getUserParticipation(userId: Types.ObjectId): Promise<IChallengeParticipation[]>;
}

// --- Schema Definition ---
const ChallengeParticipationSchema = new Schema<IChallengeParticipation>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    challenge: { type: Schema.Types.ObjectId, ref: "Challenge", required: true, index: true },
    joinedAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completed: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Compound index to ensure one participation per user per challenge ---
ChallengeParticipationSchema.index({ user: 1, challenge: 1 }, { unique: true });

// --- Virtual: progress percentage of goal ---
ChallengeParticipationSchema.virtual("progressPercent").get(function (this: IChallengeParticipation): number {
  return Math.min(Math.max(this.progress, 0), 100);
});

// --- Instance Methods ---
ChallengeParticipationSchema.methods.updateProgress = async function (
  this: IChallengeParticipation,
  amount: number
): Promise<IChallengeParticipation> {
  this.progress = Math.min(Math.max(this.progress + amount, 0), 100);
  if (this.progress >= 100) {
    this.completed = true;
  }
  await this.save();
  return this;
};

ChallengeParticipationSchema.methods.markComplete = async function (
  this: IChallengeParticipation
): Promise<IChallengeParticipation> {
  this.progress = 100;
  this.completed = true;
  await this.save();
  return this;
};

ChallengeParticipationSchema.methods.resetProgress = async function (
  this: IChallengeParticipation
): Promise<IChallengeParticipation> {
  this.progress = 0;
  this.completed = false;
  await this.save();
  return this;
};

// --- Static Methods ---
ChallengeParticipationSchema.statics.getUserParticipation = async function (userId: Types.ObjectId): Promise<IChallengeParticipation[]> {

  return this.find({ user: userId })
    .populate("challenge", "title startDate endDate status")
    .sort({ joinedAt: -1 });
};

// --- Model Export ---
export const ChallengeParticipation = mongoose.model<IChallengeParticipation, IChallengeParticipationModel>(
  "ChallengeParticipation",
  ChallengeParticipationSchema
);

export default ChallengeParticipation;
