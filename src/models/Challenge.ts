import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Interface for a reward
export interface IReward {
  rewardType: "badge" | "discount" | "prize" | "recognition";
  rewardValue: string;
}

// Interface for a milestone
export interface IMilestone {
  title: string;
  dueDate: Date;
  completed: boolean;
  achievedBy: mongoose.Types.ObjectId[];
}

// Interface for a participant
export interface IParticipant {
  user: mongoose.Types.ObjectId;
  progress: number;
  joinedAt: Date;
}

// Main Challenge interface
export interface IChallenge extends Document {
  title: string;
  description?: string;
  goal: string;
  startDate: Date;
  endDate: Date;
  creator: mongoose.Types.ObjectId;
  participants: IParticipant[];
  rewards: IReward[];
  status: "ongoing" | "completed" | "canceled";
  visibility: "public" | "private";
  progressTracking: "individual" | "team" | "both";
  milestones: IMilestone[];
  createdAt: Date;
  updatedAt: Date;

  addReward(rewardType: IReward["rewardType"], rewardValue: string): Promise<void>;
  addMilestone(milestoneTitle: string, dueDate: Date): Promise<void>;
}

interface ChallengeModel extends Model<IChallenge> {
  addParticipant(challengeId: string, userId: string): Promise<IChallenge>;
  updateProgress(challengeId: string, userId: string, progressUpdate: number): Promise<IChallenge>;
}

// Define Challenge Schema
const ChallengeSchema = new Schema<IChallenge, ChallengeModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    goal: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        progress: { type: Number, default: 0, min: 0 },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    rewards: [
      {
        rewardType: {
          type: String,
          enum: ["badge", "discount", "prize", "recognition"],
          required: true,
        },
        rewardValue: {
          type: String,
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ["ongoing", "completed", "canceled"],
      default: "ongoing",
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    progressTracking: {
      type: String,
      enum: ["individual", "team", "both"],
      default: "individual",
    },
    milestones: [
      {
        title: { type: String, trim: true, required: true },
        dueDate: { type: Date, required: true },
        completed: { type: Boolean, default: false },
        achievedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for faster querying
ChallengeSchema.index({ title: 1 });
ChallengeSchema.index({ creator: 1 });
ChallengeSchema.index({ status: 1 });

// Pre-save hook to automatically mark the challenge as completed if the end date has passed
ChallengeSchema.pre<IChallenge>("save", function (next) {
  if (this.endDate < new Date() && this.status === "ongoing") {
    this.status = "completed";
  }
  next();
});

// Static method to add participants to a challenge
ChallengeSchema.statics.addParticipant = async function (
  challengeId: string,
  userId: string,
): Promise<IChallenge> {
  const challenge = await this.findById(challengeId);
  if (!challenge) throw new Error("Challenge not found");

  const isParticipant = challenge.participants.some(
    (p) => p.user.toString() === userId,
  );
  if (isParticipant) throw new Error("User is already participating in this challenge");

  challenge.participants.push({
    user: new mongoose.Types.ObjectId(userId),
    progress: 0,
    joinedAt: new Date(),
  });
  await challenge.save();
  return challenge;
};

// Static method to update progress
ChallengeSchema.statics.updateProgress = async function (
  challengeId: string,
  userId: string,
  progressUpdate: number,
): Promise<IChallenge> {
  const challenge = await this.findById(challengeId);
  if (!challenge) throw new Error("Challenge not found");

  const participant = challenge.participants.find(
    (p) => p.user.toString() === userId,
  );
  if (!participant) throw new Error("User is not a participant in this challenge");

  participant.progress = Math.min(participant.progress + progressUpdate, 100); // Cap progress at 100
  await challenge.save();
  return challenge;
};

// Instance method to add a reward to a challenge
ChallengeSchema.methods.addReward = async function (
  rewardType: IReward["rewardType"],
  rewardValue: string,
): Promise<void> {
  this.rewards.push({ rewardType, rewardValue });
  await this.save();
};

// Instance method to add a milestone to a challenge
ChallengeSchema.methods.addMilestone = async function (
  milestoneTitle: string,
  dueDate: Date,
): Promise<void> {
  this.milestones.push({
    title: milestoneTitle,
    dueDate,
    completed: false,
    achievedBy: [],
  });
  await this.save();
};

// Virtual field to get the number of participants
ChallengeSchema.virtual("participantCount").get(function () {
  return this.participants.length;
});

// Virtual field to check if the challenge is active
ChallengeSchema.virtual("isActive").get(function () {
  return this.status === "ongoing" && this.endDate > new Date();
});

// Export the Challenge model
const Challenge = mongoose.model<IChallenge, ChallengeModel>(
  "Challenge",
  ChallengeSchema,
);

export default Challenge;
