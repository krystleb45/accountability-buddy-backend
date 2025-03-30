import mongoose, { Document, Model, Schema, Types } from "mongoose";

// Define the Group Invitation Interface
export interface IGroupInvitation extends Document {
  groupId: Types.ObjectId; // The group to which the invitation is for
  sender: Types.ObjectId; // The user who sends the invitation
  recipient: Types.ObjectId; // The user who receives the invitation
  status: "pending" | "accepted" | "rejected"; // Status of the invitation
  createdAt: Date; // Timestamp when the invitation was created
  updatedAt: Date; // Timestamp when the invitation was last updated
}

// Define the Group Invitation Schema
const GroupInvitationSchema = new Schema<IGroupInvitation>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group", // Reference to the Group model
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"], // Status of the invitation
      default: "pending",
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt`
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add index to optimize queries
GroupInvitationSchema.index({ groupId: 1, recipient: 1 }, { unique: true }); // Ensure a unique invitation for each group and recipient

// Export the Group Invitation model
const GroupInvitation: Model<IGroupInvitation> = mongoose.model<IGroupInvitation>(
  "GroupInvitation",
  GroupInvitationSchema
);

export default GroupInvitation;
