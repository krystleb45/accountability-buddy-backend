// src/api/models/Follow.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Document Interface ---
export interface IFollow extends Document {
  follower: Types.ObjectId;   // User who follows
  following: Types.ObjectId;  // User being followed
  createdAt: Date;            // Auto-set by timestamps
  updatedAt: Date;            // Auto-set by timestamps
}

// --- Static Model Interface ---
export interface IFollowModel extends Model<IFollow> {
  getFollowers(userId: Types.ObjectId): Promise<IFollow[]>;
  getFollowings(userId: Types.ObjectId): Promise<IFollow[]>;
  unfollow(
    followerId: Types.ObjectId,
    followingId: Types.ObjectId
  ): Promise<{ deletedCount?: number }>;
}

// --- Schema Definition ---
const FollowSchema = new Schema<IFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    following: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

// --- Indexes ---
// Ensure a user cannot follow the same person multiple times
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

// --- Static Methods ---
FollowSchema.statics.getFollowers = function (
  userId: Types.ObjectId
): Promise<IFollow[]> {
  return this.find({ following: userId }).populate(
    "follower",
    "username profilePicture"
  );
};

FollowSchema.statics.getFollowings = function (
  userId: Types.ObjectId
): Promise<IFollow[]> {
  return this.find({ follower: userId }).populate(
    "following",
    "username profilePicture"
  );
};

FollowSchema.statics.unfollow = function (
  followerId: Types.ObjectId,
  followingId: Types.ObjectId
): Promise<{ deletedCount?: number }> {
  return this.deleteOne({ follower: followerId, following: followingId });
};

// --- Model Export ---
export const Follow = mongoose.model<IFollow, IFollowModel>(
  "Follow",
  FollowSchema
);
export default Follow;
