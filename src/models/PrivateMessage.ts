import type { Document, Model, Query } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface IPrivateMessage extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  content: string;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  isUnread: boolean; // Virtual field
}
// Define the schema with explicit return types for all functions
const PrivateMessageSchema = new Schema<IPrivateMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for optimized queries by sender
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for optimized queries by receiver
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [2000, "Message content cannot exceed 2000 characters"], // Set a maximum length for content
    },
    isRead: {
      type: Boolean,
      default: false, // Tracks whether the message has been read
    },
    isDeleted: {
      type: Boolean,
      default: false, // Soft delete flag for messages
    },
  },
  {
    timestamps: true, // Automatically add 'createdAt' and 'updatedAt' fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for optimized querying
PrivateMessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

// Virtual field to check if the message is unread
PrivateMessageSchema.virtual("isUnread").get(function (): boolean {
  return !this.isRead;
});

// Pre-save hook to trim whitespace from content
PrivateMessageSchema.pre<IPrivateMessage>("save", function (next): void {
  if (this.isModified("content")) {
    this.content = this.content.trim();
  }
  next();
});

// Static method to mark a message as read
PrivateMessageSchema.statics.markAsRead = async function (
  messageId: string,
): Promise<IPrivateMessage> {
  const message = await this.findById(messageId);
  if (!message) throw new Error("Message not found");

  if (!message.isRead) {
    message.isRead = true;
    await message.save();
  }

  return message;
};

// Static method for soft deletion of messages
PrivateMessageSchema.statics.softDelete = async function (
  messageId: string,
): Promise<IPrivateMessage> {
  const message = await this.findById(messageId);
  if (!message) throw new Error("Message not found");

  message.isDeleted = true;
  await message.save();
  return message;
};

// Middleware to exclude deleted messages from query results
PrivateMessageSchema.pre<Query<IPrivateMessage[], IPrivateMessage>>(
  /^find/,
  function (next): void {
    this.where({ isDeleted: false });
    next();
  },
);

// Middleware to prevent sending messages to oneself
PrivateMessageSchema.pre<IPrivateMessage>("validate", function (next): void {
  if (this.sender.equals(this.receiver)) {
    next(new Error("Cannot send a message to yourself"));
  } else {
    next();
  }
});

// Export the model
export const PrivateMessage: Model<IPrivateMessage> = mongoose.model<IPrivateMessage>(
  "PrivateMessage",
  PrivateMessageSchema,
);
