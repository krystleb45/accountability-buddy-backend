// src/api/models/GroupInvitation.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Document Interface ---
export interface IGroupInvitation extends Document {
  groupId: Types.ObjectId;      // The group to which the invitation applies
  sender: Types.ObjectId;       // User who sends the invitation
  recipient: Types.ObjectId;    // User who receives the invitation
  status: "pending" | "accepted" | "rejected"; // Invitation status
  createdAt: Date;              // Auto-generated
  updatedAt: Date;              // Auto-generated
}

// --- Model Interface ---
export interface IGroupInvitationModel extends Model<IGroupInvitation> {
  sendInvitation(
    groupId: Types.ObjectId,
    senderId: Types.ObjectId,
    recipientId: Types.ObjectId
  ): Promise<IGroupInvitation>;
  respondInvitation(
    invitationId: Types.ObjectId,
    status: "accepted" | "rejected"
  ): Promise<IGroupInvitation | null>;
  getPendingForUser(userId: Types.ObjectId): Promise<IGroupInvitation[]>;
}

// --- Schema Definition ---
const GroupInvitationSchema = new Schema<IGroupInvitation, IGroupInvitationModel>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// --- Indexes ---
GroupInvitationSchema.index({ groupId: 1, recipient: 1 }, { unique: true });
GroupInvitationSchema.index({ sender: 1 });
GroupInvitationSchema.index({ recipient: 1 });
GroupInvitationSchema.index({ status: 1 });

// --- Static Methods ---
GroupInvitationSchema.statics.sendInvitation = async function (
  this: IGroupInvitationModel,
  groupId: Types.ObjectId,
  senderId: Types.ObjectId,
  recipientId: Types.ObjectId
): Promise<IGroupInvitation> {
  const existing = await this.findOne({ groupId, recipient: recipientId }).exec();
  if (existing) {
    throw new Error("Invitation already exists for this user in the group");
  }
  return this.create({ groupId, sender: senderId, recipient: recipientId });
};

GroupInvitationSchema.statics.respondInvitation = async function (
  this: IGroupInvitationModel,
  invitationId: Types.ObjectId,
  status: "accepted" | "rejected"
): Promise<IGroupInvitation | null> {
  const invite = await this.findById(invitationId).exec();
  if (!invite) return null;
  invite.status = status;
  return invite.save();
};

GroupInvitationSchema.statics.getPendingForUser = function (
  this: IGroupInvitationModel,
  userId: Types.ObjectId
): Promise<IGroupInvitation[]> {
  return this.find({ recipient: userId, status: "pending" })
    .sort({ createdAt: -1 })
    .populate("groupId", "name description")
    .exec();
};

// --- Model Export ---
export const GroupInvitation = mongoose.model<IGroupInvitation, IGroupInvitationModel>(
  "GroupInvitation",
  GroupInvitationSchema
);

export default GroupInvitation;
