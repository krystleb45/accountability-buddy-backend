import { Schema, model, Document, Types } from "mongoose";

// Enum for Friend Request Status
export enum FriendRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

// FriendRequest interface for type safety
export interface IFriendRequest extends Document {
  sender: Types.ObjectId; // The user who sent the request
  recipient: Types.ObjectId; // The user who received the request
  status: FriendRequestStatus; // The status of the friend request (pending, accepted, rejected)
  createdAt: Date; // Date when the request was sent
  updatedAt: Date; // Date when the request status was last updated
}

// FriendRequest Schema
const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(FriendRequestStatus),
      default: FriendRequestStatus.PENDING,
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

// Add an index to quickly query friend requests between two users
FriendRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true });

// Export the FriendRequest model
const FriendRequest = model<IFriendRequest>("FriendRequest", FriendRequestSchema);
export default FriendRequest;
