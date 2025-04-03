import type { Document, Types, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

/**
 * Interface for military chatroom messages.
 */
export interface IMilitaryMessage extends Document {
  chatroom: Types.ObjectId;
  user: Types.ObjectId;
  text: string;
  timestamp: Date;
  isDeleted?: boolean;
  attachments?: string[]; // Optional: URLs to media files
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const MilitaryMessageSchema: Schema<IMilitaryMessage> = new Schema(
  {
    chatroom: {
      type: Schema.Types.ObjectId,
      ref: "MilitarySupportChatroom",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        type: String, // URL to file
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Text index for full-text search
MilitaryMessageSchema.index({ text: "text" });

// Export the model
const MilitaryMessage: Model<IMilitaryMessage> = mongoose.model<IMilitaryMessage>(
  "MilitaryMessage",
  MilitaryMessageSchema
);

export default MilitaryMessage;
