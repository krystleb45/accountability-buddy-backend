// src/api/models/Chat.ts
import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import sanitize from "mongo-sanitize";
import { logger } from "../../utils/winstonLogger";

// --- Types & Interfaces ---
export type ChatType = "private" | "group";

export interface IUnreadCount {
  userId: Types.ObjectId;
  count: number;
}

export interface IChat extends Document {
  participants: Types.ObjectId[];
  messages: Types.ObjectId[];
  chatType: ChatType;
  groupName?: string;
  chatAvatar?: string;
  unreadMessages: IUnreadCount[];
  lastMessage?: Types.ObjectId;
  typingUsers: Types.ObjectId[];
  isPinned: boolean;
  admins?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  participantCount: number;
  messageCount: number;

  // Instance methods
  addMessage(messageId: Types.ObjectId): Promise<IChat>;
  markRead(userId: Types.ObjectId): Promise<IChat>;
  addTypingUser(userId: Types.ObjectId): Promise<IChat>;
  removeTypingUser(userId: Types.ObjectId): Promise<IChat>;
  pin(): Promise<IChat>;
  unpin(): Promise<IChat>;
}

export interface IChatModel extends Model<IChat> {
  getUserChats(userId: Types.ObjectId): Promise<IChat[]>;
  getGroupChats(): Promise<IChat[]>;
}

// --- Schema Definition ---
const ChatSchema = new Schema<IChat>(
  {
   
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    messages:     [{ type: Schema.Types.ObjectId, ref: "Message" }],
    chatType:     { type: String, enum: ["private", "group"], required: true },
    groupName:    { type: String, trim: true, maxlength: 100, default: null },
    chatAvatar:   { type: String, default: null },
    unreadMessages: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        count:  { type: Number, default: 0 },
      }
    ],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    typingUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isPinned:    { type: Boolean, default: false },
    admins:      [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
    toJSON:    { virtuals: true },
    toObject:  { virtuals: true },
  }
);

// --- Indexes ---
ChatSchema.index({ participants: 1, createdAt: -1 });
ChatSchema.index({ groupName: 1 }, { sparse: true });
ChatSchema.index({ "unreadMessages.userId": 1 });
ChatSchema.index({ lastMessage: -1 });
ChatSchema.index({ isPinned: 1 });

// --- Virtuals ---
ChatSchema.virtual("participantCount").get(function (this: IChat): number {
  return this.participants.length;
});
ChatSchema.virtual("messageCount").get(function (this: IChat): number {
  return this.messages.length;
});

// --- Instance Methods ---
ChatSchema.methods.addMessage = async function (
  this: IChat,
  messageId: Types.ObjectId
): Promise<IChat> {
  this.messages.push(messageId);
  this.lastMessage = messageId;
  // increment unread for others
  this.participants.forEach((userId) => {
    if (!userId.equals(messageId)) {
      const um = this.unreadMessages.find(u => u.userId.equals(userId));
      if (um) um.count += 1;
      else this.unreadMessages.push({ userId, count: 1 });
    }
  });
  await this.save();
  return this;
};

ChatSchema.methods.markRead = async function (
  this: IChat,
  userId: Types.ObjectId
): Promise<IChat> {
  const um = this.unreadMessages.find(u => u.userId.equals(userId));
  if (um) um.count = 0;
  await this.save();
  return this;
};

ChatSchema.methods.addTypingUser = async function (
  this: IChat,
  userId: Types.ObjectId
): Promise<IChat> {
  if (!this.typingUsers.includes(userId)) this.typingUsers.push(userId);
  await this.save();
  return this;
};

ChatSchema.methods.removeTypingUser = async function (
  this: IChat,
  userId: Types.ObjectId
): Promise<IChat> {
  this.typingUsers = this.typingUsers.filter(id => !id.equals(userId));
  await this.save();
  return this;
};

ChatSchema.methods.pin = async function (this: IChat): Promise<IChat> {
  this.isPinned = true;
  await this.save();
  return this;
};

ChatSchema.methods.unpin = async function (this: IChat): Promise<IChat> {
  this.isPinned = false;
  await this.save();
  return this;
};

// --- Static Methods ---
ChatSchema.statics.getUserChats = function (
  userId: Types.ObjectId
): Promise<IChat[]> {
  return this.find({ participants: userId }).sort({ updatedAt: -1 });
};

ChatSchema.statics.getGroupChats = function (): Promise<IChat[]> {
  return this.find({ chatType: "group" }).sort({ createdAt: -1 });
};

// --- Middleware ---
ChatSchema.pre<IChat>("save", function (this: IChat, next): void {
  if (this.groupName) this.groupName = sanitize(this.groupName);
  next();
});

ChatSchema.post<IChat>("save", function (doc: IChat): void {
  logger.info(
    `Chat ${doc._id} (${doc.chatType}) saved with participants [${doc.participants.join(", ")}].`
  );
});

// --- Model Export ---
export const Chat = mongoose.model<IChat, IChatModel>("Chat", ChatSchema);
export default Chat;
