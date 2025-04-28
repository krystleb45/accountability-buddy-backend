import type { Document, Model, Query, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Private Message Document Interface ---
export interface IPrivateMessage extends Document {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  content: string;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isUnread: boolean;
}

// --- Private Message Model Static Interface ---
export interface IPrivateMessageModel extends Model<IPrivateMessage> {
  markAsRead(messageId: string): Promise<IPrivateMessage>;
  softDelete(messageId: string): Promise<IPrivateMessage>;
}

// --- Schema Definition ---
const PrivateMessageSchema = new Schema<IPrivateMessage, IPrivateMessageModel, IPrivateMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [2000, "Message content cannot exceed 2000 characters"],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
PrivateMessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

// --- Virtual Field ---
PrivateMessageSchema.virtual("isUnread").get(function (this: IPrivateMessage): boolean {
  return !this.isRead;
});

// --- Middleware Hooks ---
// Trim content on save
PrivateMessageSchema.pre<IPrivateMessage>("save", function (next): void {
  if (this.isModified("content")) {
    this.content = this.content.trim();
  }
  next();
});

// Exclude deleted messages from queries
PrivateMessageSchema.pre<Query<any, IPrivateMessage>>(/^find/, function (next): void {
  this.where({ isDeleted: false });
  next();
});

// Prevent sending messages to self
PrivateMessageSchema.pre<IPrivateMessage>("validate", function (next): void {
  if (this.sender.equals(this.receiver)) {
    next(new Error("Cannot send a message to yourself"));
  } else {
    next();
  }
});

// --- Static Methods ---
PrivateMessageSchema.statics.markAsRead = async function (
  this: IPrivateMessageModel,
  messageId: string
): Promise<IPrivateMessage> {
  const message = await this.findById(messageId);
  if (!message) throw new Error("Message not found");

  if (!message.isRead) {
    message.isRead = true;
    await message.save();
  }
  return message;
};

PrivateMessageSchema.statics.softDelete = async function (
  this: IPrivateMessageModel,
  messageId: string
): Promise<IPrivateMessage> {
  const message = await this.findById(messageId);
  if (!message) throw new Error("Message not found");

  message.isDeleted = true;
  await message.save();
  return message;
};

// --- Model Export ---
export const PrivateMessage = mongoose.model<IPrivateMessage, IPrivateMessageModel>(
  "PrivateMessage",
  PrivateMessageSchema
);

export default PrivateMessage;
