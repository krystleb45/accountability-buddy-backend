import { Schema, Document, Model } from "mongoose";
import mongoose from "mongoose";

// Define the Invitation interface
export interface IInvitation extends Document {
  groupId: mongoose.Types.ObjectId; // Group being invited to
  sender: mongoose.Types.ObjectId;  // User who sent the invitation
  recipient: mongoose.Types.ObjectId; // User receiving the invitation
  status: "pending" | "accepted" | "rejected"; // Status of the invitation
  createdAt: Date;
  updatedAt: Date;
}

// Define the Invitation schema
const InvitationSchema = new Schema<IInvitation>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group", // Referencing the Group model
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User", // Referencing the User model
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User", // Referencing the User model
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for optimization
InvitationSchema.index({ groupId: 1, recipient: 1 }, { unique: true }); // Ensure no duplicate invitations

// Named export
export const Invitation: Model<IInvitation> = mongoose.model<IInvitation>(
  "Invitation",
  InvitationSchema
);

// Default export
export default Invitation;
