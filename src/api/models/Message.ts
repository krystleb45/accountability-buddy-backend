import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Types ---
export type MessageType = "private" | "group";
export type MessageStatus = "sent" | "delivered" | "seen" | "deleted" | "edited";

// --- Reaction Subdocument ---
export interface IReaction {
  userId: Types.ObjectId;
  emoji: string;
  reactedAt: Date;
}

const ReactionSchema = new Schema<IReaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    emoji: { type: String, required: true },
    reactedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

// --- Attachment Subdocument ---
export interface IAttachment {
  url: string;
  type: "image" | "video" | "file";
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true, trim: true },
    type: { type: String, enum: ["image", "video", "file"], required: true }
  },
  { _id: false }
);

// --- Message Document Interface ---
export interface IMessage extends Document {
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId?: Types.ObjectId;
  text?: string;
  messageType: MessageType;
  status: MessageStatus;
  reactions: Types.DocumentArray<IReaction>;
  attachments: Types.DocumentArray<IAttachment>;
  replyTo?: Types.ObjectId;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  reactionCount: number;
  attachmentCount: number;

  // Instance methods
  addReaction(userId: Types.ObjectId, emoji: string): Promise<IMessage>;
  removeReaction(userId: Types.ObjectId): Promise<IMessage>;
  edit(newText: string): Promise<IMessage>;
  softDelete(): Promise<IMessage>;
}

// --- Message Model Interface ---
export interface IMessageModel extends Model<IMessage> {
  getByChat(chatId: Types.ObjectId, limit?: number): Promise<IMessage[]>;
  getUserMessages(userId: Types.ObjectId, limit?: number): Promise<IMessage[]>;
}

// --- Schema Definition ---
const MessageSchema = new Schema<IMessage, IMessageModel>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    text: { type: String, trim: true },
    messageType: { type: String, enum: ["private", "group"], required: true },
    status: { type: String, enum: ["sent", "delivered", "seen", "deleted", "edited"], default: "sent", index: true },
    reactions: { type: [ReactionSchema], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },
    replyTo: { type: Schema.Types.ObjectId, ref: "Message", index: true },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// --- Virtuals ---
MessageSchema.virtual("reactionCount").get(function (this: IMessage): number {
  return this.reactions.length;
});

MessageSchema.virtual("attachmentCount").get(function (this: IMessage): number {
  return this.attachments.length;
});

// --- Middleware ---
MessageSchema.pre<IMessage>("save", function (next) {
  if (this.isModified("text") && this.status !== "deleted") {
    this.status = "edited";
  }
  next();
});

// --- Instance Methods ---
MessageSchema.methods.addReaction = async function (
  this: IMessage,
  userId: Types.ObjectId,
  emoji: string
): Promise<IMessage> {
  this.reactions.push({ userId, emoji, reactedAt: new Date() });
  await this.save();
  return this;
};

MessageSchema.methods.removeReaction = async function (
  this: IMessage,
  userId: Types.ObjectId
): Promise<IMessage> {
  this.reactions = this.reactions.filter(r => !r.userId.equals(userId)) as any;
  await this.save();
  return this;
};

MessageSchema.methods.edit = async function (
  this: IMessage,
  newText: string
): Promise<IMessage> {
  this.text = newText;
  this.status = "edited";
  await this.save();
  return this;
};

MessageSchema.methods.softDelete = async function (
  this: IMessage
): Promise<IMessage> {
  this.status = "deleted";
  await this.save();
  return this;
};

// --- Static Methods ---
MessageSchema.statics.getByChat = function (
  chatId: Types.ObjectId,
  limit = 50
): Promise<IMessage[]> {
  return this.find({ chatId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("senderId", "username profilePicture")
    .populate("reactions.userId", "username");
};

MessageSchema.statics.getUserMessages = function (
  userId: Types.ObjectId,
  limit = 50
): Promise<IMessage[]> {
  return this.find({ $or: [{ senderId: userId }, { receiverId: userId }] })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("chatId");
};

// --- Indexes ---
MessageSchema.index({ chatId: 1, timestamp: -1 });
MessageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });
MessageSchema.index({ status: 1 });
MessageSchema.index({ replyTo: 1 });

// --- Model Export ---
export const Message = mongoose.model<IMessage, IMessageModel>("Message", MessageSchema);
export default Message;
