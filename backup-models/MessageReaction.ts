// src/api/models/MessageReaction.ts
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
const MessageReactionSchema = new Schema<IMessageReaction, IMessageReactionModel>(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reaction: {
      type: String,
      required: true,
      enum: ["like", "love", "haha", "sad", "angry", "wow"]
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt
  }
);

// --- Indexes ---
MessageReactionSchema.index(
  { messageId: 1, userId: 1, reaction: 1 },
  { unique: true }
);
MessageReactionSchema.index({ messageId: 1 });
MessageReactionSchema.index({ userId: 1 });

// --- Static Methods ---
MessageReactionSchema.statics.addReaction = function (
  this: IMessageReactionModel,
  messageId: Types.ObjectId,
  userId: Types.ObjectId,
  reaction: ReactionType
): Promise<IMessageReaction> {
  return this.create({ messageId, userId, reaction });
};

MessageReactionSchema.statics.removeReaction = function (
  this: IMessageReactionModel,
  messageId: Types.ObjectId,
  userId: Types.ObjectId,
  reaction: ReactionType
): Promise<{ deletedCount?: number }> {
  return this.deleteOne({ messageId, userId, reaction });
};

MessageReactionSchema.statics.getReactionsForMessage = function (
  this: IMessageReactionModel,
  messageId: Types.ObjectId
): Promise<IMessageReaction[]> {
  return this.find({ messageId })
    .sort({ createdAt: -1 })
    .populate("userId", "username profilePicture")
    .exec();
};

MessageReactionSchema.statics.countReactions = async function (
  this: IMessageReactionModel,
  messageId: Types.ObjectId
): Promise<Record<ReactionType, number>> {
  const results = await this.aggregate([
    { $match: { messageId } },
    { $group: { _id: "$reaction", count: { $sum: 1 } } }
  ]).exec();

  return results.reduce(
    (acc: Record<ReactionType, number>, cur: { _id: ReactionType; count: number }) => {
      acc[cur._id] = cur.count;
      return acc;
    },
    { like: 0, love: 0, haha: 0, sad: 0, angry: 0, wow: 0 }
  );
};

// --- Model Export ---
export const MessageReaction = mongoose.model<
  IMessageReaction,
  IMessageReactionModel
>("MessageReaction", MessageReactionSchema);

export default MessageReaction;
