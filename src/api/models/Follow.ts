import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Interface ---
export interface IFollow extends Document {
  follower: Types.ObjectId;   // User who follows
  following: Types.ObjectId;  // User being followed
  createdAt: Date;            // Auto-set by timestamps
  updatedAt: Date;            // Auto-set by timestamps
}

// --- Model Interface ---
export interface IFollowModel extends Model<IFollow> {
  getFollowers(userId: Types.ObjectId): Promise<IFollow[]>;
  getFollowings(userId: Types.ObjectId): Promise<IFollow[]>;
  unfollow(followerId: Types.ObjectId, followingId: Types.ObjectId): Promise<{ deletedCount?: number }>;
}

// --- Schema Definition ---
const FollowSchema = new Schema<IFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    following: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  {
    timestamps: true,
  }
);

// Ensure a user cannot follow the same person multiple times
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

// --- Static Methods ---
/**
 * Get all followers of a user
 */
FollowSchema.statics.getFollowers = function (
  userId: Types.ObjectId
): Promise<IFollow[]> {
  return this.find({ following: userId }).populate("follower", "username profilePicture");
};

/**
 * Get all users that the given user is following
 */
FollowSchema.statics.getFollowings = function (
  userId: Types.ObjectId
): Promise<IFollow[]> {
  return this.find({ follower: userId }).populate("following", "username profilePicture");
};

/**
 * Unfollow a user
 */
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
