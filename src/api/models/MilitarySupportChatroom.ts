import { Schema, model, Document, Types, Model, ObjectId } from "mongoose";

/**
 * Interface for Military Support Chatrooms.
 */
export interface IMilitarySupportChatroom extends Document {
  name: string;
  description: string;
  members: Types.ObjectId[]; // Array of User ObjectIds
  visibility: "public" | "private"; // NEW: visibility control
  isActive: boolean; // NEW: soft delete flag
  createdAt: Date;
  updatedAt: Date;
  _id: ObjectId
}

// Define the schema for Military Support Chatroom
const MilitarySupportChatroomSchema = new Schema<IMilitarySupportChatroom>(
  {
    name: {
      type: String,
      required: [true, "Chatroom name is required."],
      unique: true,
      trim: true,
      minlength: [3, "Chatroom name must be at least 3 characters."],
    },
    description: {
      type: String,
      required: [true, "Description is required."],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters."],
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries and search
MilitarySupportChatroomSchema.index({ name: "text" });

// Create the model
const MilitarySupportChatroom: Model<IMilitarySupportChatroom> = model<IMilitarySupportChatroom>(
  "MilitarySupportChatroom",
  MilitarySupportChatroomSchema
);

export default MilitarySupportChatroom;
