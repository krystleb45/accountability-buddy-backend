// src/api/models/Match.ts
import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Interface for Match Document ---
export interface IMatch extends Document {
  user1: Types.ObjectId;
  user2: Types.ObjectId;
  status: "pending" | "active" | "rejected" | "completed";
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  updateStatus(status: IMatch["status"]): Promise<IMatch>;
}

// --- Model Interface for Statics ---
export interface IMatchModel extends Model<IMatch> {
  findMatchesForUser(userId: Types.ObjectId): Promise<IMatch[]>;
}

// --- Schema Definition ---
const MatchSchema = new Schema<IMatch, IMatchModel>(
  {
    user1: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user2: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "completed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// --- Indexes ---
MatchSchema.index({ user1: 1, user2: 1 }, { unique: true });
MatchSchema.index({ status: 1 });
MatchSchema.index({ user1: 1 });
MatchSchema.index({ user2: 1 });

// --- Static Methods ---
MatchSchema.statics.findMatchesForUser = function (
  this: IMatchModel,
  userId: Types.ObjectId
): Promise<IMatch[]> {
  return this.find({ $or: [{ user1: userId }, { user2: userId }] })
    .populate("user1", "username profilePicture")
    .populate("user2", "username profilePicture")
    .sort({ createdAt: -1 })
    .exec();
};

// --- Instance Methods ---
MatchSchema.methods.updateStatus = async function (
  this: IMatch,
  status: IMatch["status"]
): Promise<IMatch> {
  this.status = status;
  await this.save();
  return this;
};

// --- Model Export ---
export const Match = mongoose.model<IMatch, IMatchModel>("Match", MatchSchema);
export default Match;
