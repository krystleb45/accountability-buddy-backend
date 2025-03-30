import mongoose, { Schema, Document, Model } from "mongoose";

// Define the schema for MessageReaction
export interface IMessageReaction extends Document {
  messageId: mongoose.Types.ObjectId;  // Reference to the message being reacted to
  userId: mongoose.Types.ObjectId;     // Reference to the user who reacted
  reaction: string;                    // The reaction type (e.g., "like", "love", "haha")
  createdAt: Date;                     // Timestamp when the reaction was added
}

// Create the schema for MessageReaction
const MessageReactionSchema: Schema<IMessageReaction> = new Schema<IMessageReaction>({
  messageId: {
    type: Schema.Types.ObjectId,
    ref: "Message",  // This links the reaction to the Message model
    required: true,
    index: true,     // Index to optimize lookups by messageId
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",     // This links the reaction to the User model
    required: true,
    index: true,     // Index to optimize lookups by userId
  },
  reaction: {
    type: String,
    required: true,
    enum: ["like", "love", "haha", "sad", "angry", "wow"],  // Allowed reaction types
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add an index on messageId and userId for better query performance
MessageReactionSchema.index({ messageId: 1, userId: 1 });

// Export the MessageReaction model
const MessageReaction: Model<IMessageReaction> = mongoose.model<IMessageReaction>("MessageReaction", MessageReactionSchema);
export default MessageReaction;
