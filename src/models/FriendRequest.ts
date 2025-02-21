import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// ✅ Define the Friend Request Interface
export interface IFriendRequest extends Document {
  sender: mongoose.Types.ObjectId; // User who sent the request
  recipient: mongoose.Types.ObjectId; // User receiving the request
  status: "pending" | "accepted" | "declined"; // Status of the request
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Define the Friend Request Schema
const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Optimize queries for requests by sender
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Optimize queries for requests by recipient
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  {
    timestamps: true, // ✅ Automatically adds `createdAt` and `updatedAt`
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ✅ Prevent duplicate friend requests (unique sender-recipient pair)
FriendRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true });

// ✅ Export the FriendRequest model
const FriendRequest: Model<IFriendRequest> = mongoose.model<IFriendRequest>(
  "FriendRequest",
  FriendRequestSchema
);

export default FriendRequest;
