// src/api/models/Invitation.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type InvitationStatus = "pending" | "accepted" | "rejected";

/**
 * Invitation document interface
 */
export interface IInvitation extends Document {
  groupId: Types.ObjectId;
  sender:   Types.ObjectId;
  recipient:Types.ObjectId;
  status:   InvitationStatus;
  createdAt: Date;
  updatedAt: Date;
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
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Optional static helpers can go here
 */
interface InvitationModel extends Model<IInvitation> {
  // e.g. findPendingForGroup: (groupId: Types.ObjectId) => Promise<IInvitation[]>;
}

export const Invitation = mongoose.model<IInvitation, InvitationModel>(
  "Invitation",
  InvitationSchema
);

export default Invitation;
