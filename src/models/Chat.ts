import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import sanitize from "mongo-sanitize";
import logger from "../utils/winstonLogger"; // Optional: for logging

// Define TypeScript interface for Chat document
export interface IChat extends Document {
  _id: mongoose.Types.ObjectId; // ✅ Explicitly define `_id` to fix `unknown` type errors
  participants: mongoose.Types.ObjectId[]; // Supports multiple participants (private & group chats)
  messages: mongoose.Types.ObjectId[]; // Stores all messages in the chat
  chatType: "private" | "group"; // Determines if it's a private or group chat
  groupName?: string; // Only for group chats
  unreadMessages: { userId: mongoose.Types.ObjectId; count: number }[]; // ✅ Track unread messages
  createdAt: Date;
  updatedAt: Date;
}

// Define the Chat schema
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
      default: null, // Ensure groupName defaults to `null` for private chats
    },
    unreadMessages: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        count: { type: Number, default: 0 }, // ✅ Track unread messages per user
      },
    ],
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt`
  }
);

// ✅ Add Indexes for Faster Queries
ChatSchema.index({ participants: 1, createdAt: -1 }); // Speed up user chat lookups
ChatSchema.index({ groupName: 1 }, { sparse: true }); // Faster group lookups, avoids indexing null values
ChatSchema.index({ "unreadMessages.userId": 1 }); // ✅ Optimize unread message tracking

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
