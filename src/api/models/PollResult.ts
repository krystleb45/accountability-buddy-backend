import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- PollResult Document Interface ---
export interface IPollResult extends Document {
  pollId: Types.ObjectId;       // Poll ID
  optionId: Types.ObjectId;     // Option ID
  votesCount: number;           // Number of votes
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  incrementVotes(count?: number): Promise<IPollResult>;
  resetVotes(): Promise<IPollResult>;
}

// --- PollResult Model Static Interface ---
export interface IPollResultModel extends Model<IPollResult> {
  getResultsForPoll(pollId: Types.ObjectId): Promise<IPollResult[]>;
  recordVote(pollId: Types.ObjectId, optionId: Types.ObjectId): Promise<IPollResult>;
}

// --- Schema Definition ---
const PollResultSchema = new Schema<IPollResult, IPollResultModel>(
  {
    pollId: {
      type: Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
      index: true,
    },
    optionId: {
      type: Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
      index: true,
    },
    votesCount: {
      type: Number,
      default: 0,
      min: [0, "Votes count cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique poll-option combination
PollResultSchema.index({ pollId: 1, optionId: 1 }, { unique: true });

// --- Instance Methods ---
PollResultSchema.methods.incrementVotes = async function (
  this: IPollResult,
  count = 1
): Promise<IPollResult> {
  this.votesCount += count;
  await this.save();
  return this;
};

PollResultSchema.methods.resetVotes = async function (
  this: IPollResult
): Promise<IPollResult> {
  this.votesCount = 0;
  await this.save();
  return this;
};

// --- Static Methods ---
PollResultSchema.statics.getResultsForPoll = function (
  pollId: Types.ObjectId
): Promise<IPollResult[]> {
  return this.find({ pollId }).sort({ votesCount: -1 });
};

PollResultSchema.statics.recordVote = async function (
  pollId: Types.ObjectId,
  optionId: Types.ObjectId
): Promise<IPollResult> {
  const filter = { pollId, optionId };
  const update = { $inc: { votesCount: 1 } };
  const opts = { new: true, upsert: true, setDefaultsOnInsert: true };
  const result = await this.findOneAndUpdate(filter, update, opts);
  if (!result) throw new Error("Failed to record vote");
  return result;
};

// --- Model Export ---
export const PollResult = mongoose.model<IPollResult, IPollResultModel>(
  "PollResult",
  PollResultSchema
);

export default PollResult;
