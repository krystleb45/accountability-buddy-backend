import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import sanitize from "mongo-sanitize";
import { logger } from "../../utils/winstonLogger";

// ✅ Define TypeScript interface for Chat document
export interface IChat extends Document {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[]; // Supports multiple participants (private & group chats)
  messages: mongoose.Types.ObjectId[]; // Stores all messages in the chat
  chatType: "private" | "group"; // Determines if it's a private or group chat
  groupName?: string; // Only for group chats
  chatAvatar?: string; // Avatar for group chats
  unreadMessages: { userId: mongoose.Types.ObjectId; count: number }[]; // Track unread messages
  lastMessage?: mongoose.Types.ObjectId; // Store last message for quick previews
  typingUsers: mongoose.Types.ObjectId[]; // Track users currently typing
  isPinned: boolean; // Allows users to pin the chat
  admins?: mongoose.Types.ObjectId[]; // Group chat admins
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Define the Chat schema
const ChatSchema: Schema<IChat> = new Schema<IChat>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true, // Optimized lookup for user-specific chats
      },
    ],
    messages: [
      {
        type: Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    chatType: {
      type: String,
      enum: ["private", "group"],
      required: true,
    },
    groupName: {
      type: String,
      trim: true,
      maxlength: [100, "Group name cannot exceed 100 characters"],
      default: null, // Default to null for private chats
    },
    chatAvatar: { type: String, default: null }, // Group chat avatar
    unreadMessages: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        count: { type: Number, default: 0 }, // Track unread messages per user
      },
    ],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" }, // Store last message for chat preview
    typingUsers: [{ type: Schema.Types.ObjectId, ref: "User" }], // Users currently typing
    isPinned: { type: Boolean, default: false }, // Allows users to pin chats
    admins: [{ type: Schema.Types.ObjectId, ref: "User" }], // Group chat admins
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt`
  }
);

// ✅ Add Indexes for Faster Queries
ChatSchema.index({ participants: 1, createdAt: -1 }); // Speed up user chat lookups
ChatSchema.index({ groupName: 1 }, { sparse: true }); // Faster group lookups, avoids indexing null values
ChatSchema.index({ "unreadMessages.userId": 1 }); // Optimize unread message tracking
ChatSchema.index({ lastMessage: -1 }); // Fast retrieval of latest messages
ChatSchema.index({ isPinned: 1 }); // Optimize pinned chats lookup

// Adding indexes for frequent queries like chatId, userId, and messageId
ChatSchema.index({ _id: 1 }); // Index for chatId
ChatSchema.index({ "participants": 1 }); // Index for userId (for faster lookup by user)
ChatSchema.index({ "messages": 1 }); // Index for messageId (for fast message lookup)

// ✅ Pre-save hook to sanitize group name
ChatSchema.pre<IChat>("save", function (next): void {
  if (this.groupName) {
    this.groupName = sanitize(this.groupName);
  }
  next();
});

// ✅ Post-save hook for logging chat creation (Optional)
ChatSchema.post<IChat>("save", function (doc: IChat): void {
  logger.info(
    `New ${doc.chatType} chat created: ${doc._id} with participants ${doc.participants}`
  );
});

// ✅ Export the Chat model
const Chat: Model<IChat> = mongoose.model<IChat>("Chat", ChatSchema);
export default Chat;
