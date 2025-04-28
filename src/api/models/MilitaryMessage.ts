import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Interface for MilitaryMessage Document ---
export interface IMilitaryMessage extends Document {
  chatroom: Types.ObjectId;      // Reference to MilitarySupportChatroom
  user: Types.ObjectId;          // Sender User
  text: string;                  // Message text
  timestamp: Date;               // Original send time
  isDeleted: boolean;            // Soft-delete flag
  attachments: string[];         // URLs to media files
  createdAt: Date;               // Auto-generated
  updatedAt: Date;               // Auto-generated

  // Virtuals
  attachmentCount: number;

  // Instance methods
  softDelete(): Promise<IMilitaryMessage>;
  addAttachment(url: string): Promise<IMilitaryMessage>;
}

// --- Model Interface for Statics ---
export interface IMilitaryMessageModel extends Model<IMilitaryMessage> {
  getByChatroom(
    chatroomId: Types.ObjectId,
    limit?: number
  ): Promise<IMilitaryMessage[]>;
  searchText(
    query: string,
    chatroomId?: Types.ObjectId
  ): Promise<IMilitaryMessage[]>;
}

// --- Schema Definition ---
const MilitaryMessageSchema = new Schema<IMilitaryMessage, IMilitaryMessageModel>(
  {
    chatroom: {
      type: Schema.Types.ObjectId,
      ref: "MilitarySupportChatroom",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
MilitaryMessageSchema.index({ text: "text" });

// --- Virtuals ---
MilitaryMessageSchema.virtual("attachmentCount").get(function (this: IMilitaryMessage): number {
  return this.attachments.length;
});

// --- Static Methods ---
/** Fetch recent non-deleted messages for a chatroom */
MilitaryMessageSchema.statics.getByChatroom = function (
  chatroomId: Types.ObjectId,
  limit = 50
): Promise<IMilitaryMessage[]> {
  return this.find({ chatroom: chatroomId, isDeleted: false })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("user", "username rank");
};

/** Full-text search in messages, optionally within a chatroom */
MilitaryMessageSchema.statics.searchText = function (
  query: string,
  chatroomId?: Types.ObjectId
): Promise<IMilitaryMessage[]> {
  const filter: any = { $text: { $search: query }, isDeleted: false };
  if (chatroomId) filter.chatroom = chatroomId;
  return this.find(filter, { score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" } });
};

// --- Instance Methods ---
/** Soft-delete this message */
MilitaryMessageSchema.methods.softDelete = async function (
  this: IMilitaryMessage
): Promise<IMilitaryMessage> {
  this.isDeleted = true;
  await this.save();
  return this;
};

/** Add an attachment URL */
MilitaryMessageSchema.methods.addAttachment = async function (
  this: IMilitaryMessage,
  url: string
): Promise<IMilitaryMessage> {
  this.attachments.push(url);
  await this.save();
  return this;
};

// --- Model Export ---
export const MilitaryMessage = mongoose.model<IMilitaryMessage, IMilitaryMessageModel>(
  "MilitaryMessage",
  MilitaryMessageSchema
);

export default MilitaryMessage;
