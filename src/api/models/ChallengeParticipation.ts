import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for ChallengeParticipation
export interface IChallengeParticipation extends Document {
  user: mongoose.Types.ObjectId;
  challenge: mongoose.Types.ObjectId;
  joinedAt: Date;
  progress: number;
  completed: boolean;
  lastUpdated: Date;
}

// Static methods interface (if needed in future)
interface ChallengeParticipationModel extends Model<IChallengeParticipation> {
  getUserParticipation(userId: string): Promise<IChallengeParticipation[]>;
}

// Schema definition
const ChallengeParticipationSchema = new Schema<IChallengeParticipation, ChallengeParticipationModel>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  challenge: {
    type: Schema.Types.ObjectId,
    ref: "Challenge",
    required: true,
    index: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure one participation per challenge per user
ChallengeParticipationSchema.index({ user: 1, challenge: 1 }, { unique: true });

// Static method to fetch all participations by a user
ChallengeParticipationSchema.statics.getUserParticipation = async function (
  userId: string
): Promise<IChallengeParticipation[]> {
  return this.find({ user: userId }).populate("challenge");
};
  

// Pre-save hook to update lastUpdated timestamp
ChallengeParticipationSchema.pre<IChallengeParticipation>("save", function (next) {
  this.lastUpdated = new Date();
  next();
});

const ChallengeParticipation = mongoose.model<IChallengeParticipation, ChallengeParticipationModel>(
  "ChallengeParticipation",
  ChallengeParticipationSchema,
);

export default ChallengeParticipation;