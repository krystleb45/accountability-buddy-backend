import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface IMatch extends Document {
  user1: mongoose.Types.ObjectId;
  user2: mongoose.Types.ObjectId;
  status: "pending" | "active" | "rejected" | "completed";
  createdAt: Date;
  updatedAt: Date;

  updateStatus(
    status: "pending" | "active" | "rejected" | "completed"
  ): Promise<IMatch>;
}

const MatchSchema: Schema<IMatch> = new Schema(
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
  },
);

MatchSchema.index({ user1: 1, user2: 1 }, { unique: true });
MatchSchema.index({ status: 1 });

// Static method
MatchSchema.statics.findMatchesForUser = async function (
  userId: mongoose.Types.ObjectId,
): Promise<IMatch[]> {
  return await this.find({ $or: [{ user1: userId }, { user2: userId }] })
    .populate("user1", "username profilePicture")
    .populate("user2", "username profilePicture")
    .sort({ createdAt: -1 });
};

// Instance method
MatchSchema.methods.updateStatus = async function (
  this: IMatch,
  status: "pending" | "active" | "rejected" | "completed",
): Promise<IMatch> {
  this.status = status;
  await this.save();
  return this;
};

export const Match: Model<IMatch> = mongoose.model<IMatch>("Match", MatchSchema);
