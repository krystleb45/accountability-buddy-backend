import mongoose, { Document, Schema } from "mongoose";

// Define TypeScript Interface
export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId; // Associated chat (private or group)
  senderId: mongoose.Types.ObjectId; // Sender's User ID
  receiverId?: mongoose.Types.ObjectId; // Only used for private messages
  text: string;
  messageType: "private" | "group";
  status: "sent" | "delivered" | "seen"; // ✅ Read Receipt Status
  reactions: {
    user: any; userId: mongoose.Types.ObjectId; emoji: string 
}[]; // ✅ Message Reactions
  timestamp: Date;
}

// Define Mongoose Schema
const MessageSchema = new Schema<IMessage>(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Only for private messages
    text: { type: String, required: true },
    messageType: { type: String, enum: ["private", "group"], required: true },
    status: { type: String, enum: ["sent", "delivered", "seen"], default: "sent" }, // ✅ Track message status
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ], // ✅ Track message reactions
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ✅ Optimize Queries (Indexing for faster lookups)
MessageSchema.index({ chatId: 1 });
MessageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 }); // Optimized for private messages
MessageSchema.index({ status: 1 }); // ✅ Optimized for unread message lookups

const Message = mongoose.model<IMessage>("Message", MessageSchema);
export default Message;
