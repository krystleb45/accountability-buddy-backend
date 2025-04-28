import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Interface ---
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
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// Ensure one invitation per group-recipient
GroupInvitationSchema.index({ groupId: 1, recipient: 1 }, { unique: true });

// --- Static Methods ---
/**
 * Send a new invitation; throws if existing pending exists
 */
GroupInvitationSchema.statics.sendInvitation = async function (
  groupId: Types.ObjectId,
  senderId: Types.ObjectId,
  recipientId: Types.ObjectId
): Promise<IGroupInvitation> {
  const existing = await this.findOne({ groupId, recipient: recipientId });
  if (existing) {
    throw new Error("Invitation already exists for this user in the group");
  }
  return this.create({ groupId, sender: senderId, recipient: recipientId });
};

/**
 * Respond to an invitation
 */
GroupInvitationSchema.statics.respondInvitation = async function (
  invitationId: Types.ObjectId,
  status: "accepted" | "rejected"
): Promise<IGroupInvitation | null> {
  const invite = await this.findById(invitationId);
  if (!invite) return null;
  invite.status = status;
  await invite.save();
  return invite;
};

/**
 * Get all pending invitations for a user
 */
GroupInvitationSchema.statics.getPendingForUser = function (
  userId: Types.ObjectId
): Promise<IGroupInvitation[]> {
  return this.find({ recipient: userId, status: "pending" })
    .sort({ createdAt: -1 })
    .populate("groupId", "name description");
};

// --- Model Export ---
export const GroupInvitation = mongoose.model<IGroupInvitation, IGroupInvitationModel>(
  "GroupInvitation",
  GroupInvitationSchema
);
export default GroupInvitation;
