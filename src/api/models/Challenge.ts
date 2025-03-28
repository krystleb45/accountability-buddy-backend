import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Interface for a reward
export interface IReward {
  rewardType: "badge" | "discount" | "prize" | "recognition";
  rewardValue: string;
}

// Interface for a milestone
export interface IMilestone {
  _id: any;
  title: string;
  dueDate: Date;
  completed: boolean;
  achievedBy: mongoose.Types.ObjectId[]; // List of users who achieved this milestone
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
  updateMilestoneStatus(challengeId: string, milestoneId: mongoose.Types.ObjectId): Promise<void>;
  fetchChallengesWithPagination(
    page: number,
    pageSize: number,
    filters?: object
  ): Promise<IChallenge[]>;
}

// Define Challenge Schema
const ChallengeSchema = new Schema<IChallenge, ChallengeModel>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    goal: { type: String, required: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    participants: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        progress: { type: Number, default: 0, min: 0 },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    rewards: [
      {
        rewardType: { type: String, enum: ["badge", "discount", "prize", "recognition"], required: true },
        rewardValue: { type: String, required: true },
      },
    ],
    status: { type: String, enum: ["ongoing", "completed", "canceled"], default: "ongoing" },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
    progressTracking: { type: String, enum: ["individual", "team", "both"], default: "individual" },
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
  }
);

// Indexes for faster querying
ChallengeSchema.index({ title: 1 });
ChallengeSchema.index({ creator: 1 });
ChallengeSchema.index({ status: 1 });
ChallengeSchema.index({ visibility: 1 });
ChallengeSchema.index({ startDate: 1 });
ChallengeSchema.index({ endDate: 1 });

// Static method to fetch challenges with pagination and filters
ChallengeSchema.statics.fetchChallengesWithPagination = async function (
  page: number,
  pageSize: number,
  filters: object = {}
): Promise<IChallenge[]> {
  const skip = (page - 1) * pageSize;
  try {
    const challenges = await this.find(filters)
      .skip(skip)
      .limit(pageSize)
      .populate("creator", "username profilePicture")
      .populate("participants.user", "username profilePicture")
      .sort({ createdAt: -1 }); // Sort challenges by most recent

    return challenges;
  } catch (error) {
    throw new Error("Error fetching challenges with pagination: " + error);
  }
};

// Pre-save hook to automatically mark the challenge as completed if the end date has passed
ChallengeSchema.pre<IChallenge>("save", function (next) {
  if (this.endDate < new Date() && this.status === "ongoing") {
    this.status = "completed";
  }
  next();
});

// Virtual field to get the number of participants
ChallengeSchema.virtual("participantCount").get(function () {
  return this.participants.length;
});

// Virtual field to check if the challenge is active
ChallengeSchema.virtual("isActive").get(function () {
  return this.status === "ongoing" && this.endDate > new Date();
});

// Export the Challenge model
const Challenge = mongoose.model<IChallenge, ChallengeModel>("Challenge", ChallengeSchema);

export default Challenge;
