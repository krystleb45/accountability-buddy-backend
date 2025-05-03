// src/api/models/Friendship.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Interface for a Friendship document ---
export interface IFriendship extends Document {
  user1: Types.ObjectId;   // One side of the friendship
  user2: Types.ObjectId;   // The other side
  createdAt: Date;         // When they became friends
}

// --- Model statics interface ---
export interface IFriendshipModel extends Model<IFriendship> {
  /**
   * List all friends of a given user.
   */
  getFriends(userId: Types.ObjectId): Promise<Types.ObjectId[]>;

  /**
   * Remove the friendship between two users.
   */
  removeFriendship(
    userA: Types.ObjectId,
    userB: Types.ObjectId
  ): Promise<{ deletedCount?: number }>;
}

// --- Schema Definition ---
const FriendshipSchema = new Schema<IFriendship, IFriendshipModel>(
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// --- Indexes ---
// Ensure each pair is only stored once, regardless of order
// We enforce user1 < user2 lexicographically before saving.
FriendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });

// --- Pre‑save hook to order the pair ---
FriendshipSchema.pre<IFriendship>("save", function (next) {
  if (this.user1.toString() > this.user2.toString()) {
    // swap so that user1 < user2
    [this.user1, this.user2] = [this.user2, this.user1];
  }
  next();
});

// --- Static Methods ---
/**
 * Return a list of user IDs that are friends with the given user.
 */
FriendshipSchema.statics.getFriends = async function (
  this: IFriendshipModel,
  userId: Types.ObjectId
): Promise<Types.ObjectId[]> {
  // find any friendship where userId is either user1 or user2
  const docs = await this.find({
    $or: [{ user1: userId }, { user2: userId }],
  }).exec();

  // map to the *other* party in each document
  return docs.map((f: IFriendship) =>
    f.user1.equals(userId) ? f.user2 : f.user1
  );
};

/**
 * Remove (unfriend) between two users.
 */
FriendshipSchema.statics.removeFriendship = function (
  this: IFriendshipModel,
  userA: Types.ObjectId,
  userB: Types.ObjectId
): Promise<{ deletedCount?: number }> {
  // order the pair consistently
  let [u1, u2] =
    userA.toString() < userB.toString()
      ? [userA, userB]
      : [userB, userA];
  return this.deleteOne({ user1: u1, user2: u2 }).exec();
};

// --- Model Export ---
export const Friendship = mongoose.model<IFriendship, IFriendshipModel>(
  "Friendship",
  FriendshipSchema
);

export default Friendship;
