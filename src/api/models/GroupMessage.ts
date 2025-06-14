// src/api/models/GroupMessage.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IGroupMessage extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  timestamp: Date;
  type: "message" | "system";
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GroupMessageSchema = new Schema<IGroupMessage>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    type: {
      type: String,
      enum: ["message", "system"],
      default: "message"
    },
    editedAt: {
      type: Date,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: "groupmessages"
  }
);

// Indexes for better performance
GroupMessageSchema.index({ groupId: 1, timestamp: -1 });
GroupMessageSchema.index({ senderId: 1, timestamp: -1 });

// Virtual for formatted message response
GroupMessageSchema.virtual("formattedMessage").get(function() {
  return {
    id: this._id.toString(),
    senderId: this.senderId.toString(),
    senderName: "", // Will be populated
    content: this.content,
    timestamp: this.timestamp.toISOString(),
    type: this.type
  };
});

// Ensure virtual fields are serialized
GroupMessageSchema.set("toJSON", { virtuals: true });

const GroupMessage = mongoose.model<IGroupMessage>("GroupMessage", GroupMessageSchema);

export default GroupMessage;
