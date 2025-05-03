// src/api/models/Invitation.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type InvitationStatus = "pending" | "accepted" | "rejected";

/**
 * Invitation document interface
 */
export interface IInvitation extends Document {
  groupId:    Types.ObjectId;
  sender:     Types.ObjectId;
  recipient:  Types.ObjectId;
  status:     InvitationStatus;
  createdAt:  Date;
  updatedAt:  Date;
}

/**
 * Invitation schema
 */
const InvitationSchema = new Schema<IInvitation>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
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
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Declare indexes at the schema level:
InvitationSchema.index({ groupId: 1 });
InvitationSchema.index({ sender: 1 });
InvitationSchema.index({ recipient: 1 });
// If you need to ensure a user only gets one invitation per group:
// InvitationSchema.index({ groupId: 1, recipient: 1 }, { unique: true });

export interface InvitationModel extends Model<IInvitation> {
  // e.g. findPendingForGroup(groupId: Types.ObjectId): Promise<IInvitation[]>;
}

export const Invitation = mongoose.model<IInvitation, InvitationModel>(
  "Invitation",
  InvitationSchema
);

export default Invitation;
