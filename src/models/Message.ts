import mongoose, { Document, Schema } from "mongoose";

// ✅ Define TypeScript Interface
export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId; // Associated chat (private or group)
  senderId: mongoose.Types.ObjectId; // Sender's User ID
  receiverId?: mongoose.Types.ObjectId; // Only for private messages
  text?: string; // Optional if it's an attachment
  messageType: "private" | "group";
  status: "sent" | "delivered" | "seen" | "deleted" | "edited"; // ✅ Added "deleted" and "edited"
  reactions: { userId: mongoose.Types.ObjectId; emoji: string }[]; // ✅ Message Reactions
  timestamp: Date;
  attachments?: { url: string; type: "image" | "video" | "file" }[]; // ✅ Supports media attachments
  replyTo?: mongoose.Types.ObjectId; // ✅ References a message being replied to
}

// ✅ Define Mongoose Schema
const MessageSchema = new Schema<IMessage>(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Only for private messages
    text: { type: String, trim: true },

    messageType: { type: String, enum: ["private", "group"], required: true },

    status: {
      type: String,
      enum: ["sent", "delivered", "seen", "deleted", "edited"], // ✅ Added "deleted" and "edited"
      default: "sent",
    },

    // ✅ Message Reactions
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],

    // ✅ Attachments (Images, Videos, Files)
    attachments: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ["image", "video", "file"], required: true },
      },
    ],

    // ✅ Message Threading (Replies)
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },

    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ✅ Optimize Queries (Indexing for faster lookups)
MessageSchema.index({ chatId: 1, timestamp: -1 }); // Speed up chat retrieval
MessageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 }); // Optimize private chats
MessageSchema.index({ status: 1 }); // ✅ Optimize unread message tracking
MessageSchema.index({ replyTo: 1 }); // ✅ Optimize threaded message retrieval

// ✅ Export Message Model
const Message = mongoose.model<IMessage>("Message", MessageSchema);
export default Message;
