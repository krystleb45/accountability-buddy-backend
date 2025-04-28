import type { Document, Types } from "mongoose";
import { Schema, model } from "mongoose";

// --- FriendRequest Status Enum ---
export enum FriendRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

// --- Interface for FriendRequest ---
export interface IFriendRequest extends Document {
  sender: Types.ObjectId;      // The user who sent the request
  recipient: Types.ObjectId;   // The user who received the request
  status: FriendRequestStatus; // Status of the request
  createdAt: Date;             // When the request was sent
  updatedAt: Date;             // When the status was updated
}

// --- Schema Definition ---
const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: Object.values(FriendRequestStatus), default: FriendRequestStatus.PENDING, index: true },
  },
  { timestamps: true }
);

// Ensure a user cannot send duplicate friend requests
FriendRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true });

// --- Model Export ---
export const FriendRequest = model<IFriendRequest>("FriendRequest", FriendRequestSchema);
export default FriendRequest;
