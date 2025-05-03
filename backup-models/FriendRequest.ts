// src/api/models/FriendRequest.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Types & Interfaces ---
export type FriendRequestStatus = "pending" | "accepted" | "declined" | "rejected";

export interface IFriendRequest extends Document {
  sender: Types.ObjectId;    // User who sent the request
  recipient: Types.ObjectId; // User receiving the request
  status: FriendRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFriendRequestModel extends Model<IFriendRequest> {
  sendRequest(
    sender: Types.ObjectId,
    recipient: Types.ObjectId
  ): Promise<IFriendRequest>;
  respondRequest(
    requestId: Types.ObjectId,
    status: FriendRequestStatus
  ): Promise<IFriendRequest | null>;
  getRequestsForUser(
    userId: Types.ObjectId,
    status?: FriendRequestStatus
  ): Promise<IFriendRequest[]>;
}

// --- Schema Definition ---
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
      enum: ["pending", "accepted", "declined", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
// Prevent duplicate requests and speed lookups
FriendRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true });
FriendRequestSchema.index({ recipient: 1, status: 1 });
FriendRequestSchema.index({ sender: 1 });

// --- Static Methods ---
FriendRequestSchema.statics.sendRequest = async function (
  sender: Types.ObjectId,
  recipient: Types.ObjectId
): Promise<IFriendRequest> {
  const existing = await this.findOne({ sender, recipient });
  if (existing) {
    throw new Error("Friend request already exists");
  }
  return this.create({ sender, recipient });
};

FriendRequestSchema.statics.respondRequest = async function (
  requestId: Types.ObjectId,
  status: FriendRequestStatus
): Promise<IFriendRequest | null> {
  const req = await this.findById(requestId);
  if (!req) return null;
  req.status = status;
  await req.save();
  return req;
};

FriendRequestSchema.statics.getRequestsForUser = function (
  userId: Types.ObjectId,
  status?: FriendRequestStatus
): Promise<IFriendRequest[]> {
  const filter: Record<string, unknown> = { recipient: userId };
  if (status) filter.status = status;
  return this.find(filter)
    .sort({ createdAt: -1 })
    .populate("sender", "username profilePicture");
};

// --- Model Export ---
export const FriendRequest = mongoose.model<IFriendRequest, IFriendRequestModel>(
  "FriendRequest",
  FriendRequestSchema
);
export default FriendRequest;
