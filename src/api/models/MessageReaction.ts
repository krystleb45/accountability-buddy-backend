import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Reaction Types ---
export type ReactionType = "like" | "love" | "haha" | "sad" | "angry" | "wow";

// --- Document Interface ---
export interface IMessageReaction extends Document {
  messageId: Types.ObjectId;    // Reference to Message
  userId: Types.ObjectId;       // User who reacted
  reaction: ReactionType;       // Type of reaction
  createdAt: Date;              // Auto-generated
  updatedAt: Date;              // Auto-generated
}

// --- Model Interface (Statics) ---
export interface IMessageReactionModel extends Model<IMessageReaction> {
  addReaction(
    messageId: Types.ObjectId,
    userId: Types.ObjectId,
    reaction: ReactionType
  ): Promise<IMessageReaction>;
  removeReaction(
    messageId: Types.ObjectId,
    userId: Types.ObjectId,
    reaction: ReactionType
  ): Promise<{ deletedCount?: number }>;
  getReactionsForMessage(
    messageId: Types.ObjectId
  ): Promise<IMessageReaction[]>;
  countReactions(
    messageId: Types.ObjectId
  ): Promise<Record<ReactionType, number>>;
}

// --- Schema Definition ---
const MessageReactionSchema = new Schema<
  IMessageReaction,
  IMessageReactionModel
>(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reaction: {
      type: String,
      required: true,
      enum: ["like", "love", "haha", "sad", "angry", "wow"],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Unique: one reaction type per user per message
MessageReactionSchema.index(
  { messageId: 1, userId: 1, reaction: 1 },
  { unique: true }
);

// --- Static Methods ---
MessageReactionSchema.statics.addReaction = function (
  messageId: Types.ObjectId,
  userId: Types.ObjectId,
  reaction: ReactionType
): Promise<IMessageReaction> {
  return this.create({ messageId, userId, reaction });
};

MessageReactionSchema.statics.removeReaction = function (
  messageId: Types.ObjectId,
  userId: Types.ObjectId,
  reaction: ReactionType
): Promise<{ deletedCount?: number }> {
  return this.deleteOne({ messageId, userId, reaction });
};

MessageReactionSchema.statics.getReactionsForMessage = function (
  messageId: Types.ObjectId
): Promise<IMessageReaction[]> {
  return this.find({ messageId })
    .sort({ createdAt: -1 })
    .populate("userId", "username profilePicture");
};

MessageReactionSchema.statics.countReactions = async function (
  messageId: Types.ObjectId
): Promise<Record<ReactionType, number>> {
  const results = await this.aggregate([
    { $match: { messageId } },
    { $group: { _id: "$reaction", count: { $sum: 1 } } }
  ]);
  return results.reduce((acc: Record<string, number>, cur: any) => {
    acc[cur._id] = cur.count;
    return acc;
  }, {}) as Record<ReactionType, number>;
};

// --- Model Export ---
export const MessageReaction = mongoose.model<
  IMessageReaction,
  IMessageReactionModel
>("MessageReaction", MessageReactionSchema);

export default MessageReaction;
