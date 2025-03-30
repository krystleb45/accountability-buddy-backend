import mongoose, { Schema, Document } from "mongoose";

export interface IFollow extends Document {
  follower: mongoose.Types.ObjectId; // User who follows
  following: mongoose.Types.ObjectId; // User being followed
  createdAt: Date;
}

const FollowSchema = new Schema<IFollow>(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    following: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure a user cannot follow the same person multiple times
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

const Follow = mongoose.model<IFollow>("Follow", FollowSchema);
export default Follow;
