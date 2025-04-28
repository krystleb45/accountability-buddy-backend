import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Subdocument Interfaces ---
export interface IReward {
  rewardType: "badge" | "discount" | "prize" | "recognition";
  rewardValue: string;
}

export interface IMilestone extends Document {
  title: string;
  dueDate: Date;
  completed: boolean;
  achievedBy: Types.ObjectId[];
  _id: Types.ObjectId;
}

export interface IParticipant extends Document {
  user: Types.ObjectId;
  progress: number;
  joinedAt: Date;
  _id: Types.ObjectId;
}

// --- Main Challenge Interface ---
export interface IChallenge extends Document {
  title: string;
  description?: string;
  goal: string;
  startDate: Date;
  endDate: Date;
  creator: Types.ObjectId;
  participants: Types.DocumentArray<IParticipant>;
  rewards: IReward[];
  status: "ongoing" | "completed" | "canceled";
  visibility: "public" | "private";
  progressTracking: "individual" | "team" | "both";
  milestones: Types.DocumentArray<IMilestone>;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addReward(rewardType: IReward["rewardType"], rewardValue: string): Promise<IChallenge>;
  addMilestone(milestoneTitle: string, dueDate: Date): Promise<IMilestone>;
}

// --- Model Interface ---
export interface IChallengeModel extends Model<IChallenge> {
  addParticipant(challengeId: Types.ObjectId, userId: Types.ObjectId): Promise<IChallenge>;
  updateProgress(challengeId: Types.ObjectId, userId: Types.ObjectId, progressUpdate: number): Promise<IChallenge>;
  updateMilestoneStatus(challengeId: Types.ObjectId, milestoneId: Types.ObjectId): Promise<void>;
  fetchChallengesWithPagination(
    page: number,
    pageSize: number,
    filters?: Record<string, any>
  ): Promise<IChallenge[]>;
}

// --- Schema Definitions ---
const MilestoneSchema = new Schema<IMilestone>(
  {
    title: { type: String, required: true, trim: true },
    dueDate: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    achievedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: false }
);

const ParticipantSchema = new Schema<IParticipant>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    progress: { type: Number, default: 0, min: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const RewardSchema = new Schema<IReward>(
  {
    rewardType: {
      type: String,
      enum: ["badge", "discount", "prize", "recognition"],
      required: true,
    },
    rewardValue: { type: String, required: true },
  },
  { _id: false }
);

const ChallengeSchema = new Schema<IChallenge, IChallengeModel>(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    goal: { type: String, required: true, trim: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    participants: { type: [ParticipantSchema], default: [] },
    rewards: { type: [RewardSchema], default: [] },
    status: {
      type: String,
      enum: ["ongoing", "completed", "canceled"],
      default: "ongoing",
      index: true,
    },
    visibility: { type: String, enum: ["public", "private"], default: "public", index: true },
    progressTracking: {
      type: String,
      enum: ["individual", "team", "both"],
      default: "individual",
    },
    milestones: { type: [MilestoneSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
ChallengeSchema.index({ title: 1, creator: 1, status: 1, visibility: 1, startDate: 1, endDate: 1 });

// --- Instance Methods ---
ChallengeSchema.methods.addReward = async function (
  this: IChallenge,
  rewardType: IReward["rewardType"],
  rewardValue: string
): Promise<IChallenge> {
  this.rewards.push({ rewardType, rewardValue });
  await this.save();
  return this;
};

ChallengeSchema.methods.addMilestone = async function (
  this: IChallenge,
  milestoneTitle: string,
  dueDate: Date
): Promise<IMilestone> {
  const milestone = this.milestones.create({ title: milestoneTitle, dueDate, completed: false, achievedBy: [] });
  this.milestones.push(milestone);
  await this.save();
  return milestone;
};

// --- Static Methods ---
ChallengeSchema.statics.addParticipant = async function (
  challengeId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<IChallenge> {
  const challenge = await this.findById(challengeId);
  if (!challenge) throw new Error("Challenge not found");
  if (!challenge.participants.some(p => p.user.equals(userId))) {
    challenge.participants.push({ user: userId, progress: 0, joinedAt: new Date() } as any);
    await challenge.save();
  }
  return challenge;
};

ChallengeSchema.statics.updateProgress = async function (
  challengeId: Types.ObjectId,
  userId: Types.ObjectId,
  progressUpdate: number
): Promise<IChallenge> {
  const challenge = await this.findById(challengeId);
  if (!challenge) throw new Error("Challenge not found");
  const participant = challenge.participants.find(p => p.user.equals(userId));
  if (!participant) throw new Error("Participant not found");
  participant.progress += progressUpdate;
  await challenge.save();
  return challenge;
};

ChallengeSchema.statics.updateMilestoneStatus = async function (
  challengeId: Types.ObjectId,
  milestoneId: Types.ObjectId
): Promise<void> {
  const challenge = await this.findById(challengeId);
  if (!challenge) throw new Error("Challenge not found");
  const milestone = challenge.milestones.id(milestoneId);
  if (!milestone) throw new Error("Milestone not found");
  milestone.completed = true;
  await challenge.save();
};

ChallengeSchema.statics.fetchChallengesWithPagination = async function (
  page: number,
  pageSize: number,
  filters: Record<string, any> = {}
): Promise<IChallenge[]> {
  const skip = (page - 1) * pageSize;
  return this.find(filters)
    .skip(skip)
    .limit(pageSize)
    .populate("creator", "username profilePicture")
    .populate("participants.user", "username profilePicture")
    .sort({ createdAt: -1 });
};

// --- Pre-save Hook ---
ChallengeSchema.pre<IChallenge>("save", function (next): void {
  if (this.endDate < new Date() && this.status === "ongoing") {
    this.status = "completed";
  }
  next();
});

// --- Virtuals ---
ChallengeSchema.virtual("participantCount").get(function (this: IChallenge): number {
  return this.participants.length;
});

ChallengeSchema.virtual("isActive").get(function (this: IChallenge): boolean {
  return this.status === "ongoing" && this.endDate > new Date();
});

// --- Model Export ---
export const Challenge = mongoose.model<IChallenge, IChallengeModel>("Challenge", ChallengeSchema);
export default Challenge;
