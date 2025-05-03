// src/api/models/MilitaryUser.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Message Subdocument Interface ---
export interface IMessage {
  _id: Types.ObjectId;   // Unique message ID
  sender: Types.ObjectId; // User ID of the sender
  content: string;        // Message text
  timestamp: Date;        // When message was sent
}

// --- MilitaryUser Document Interface ---
export interface IMilitaryUser extends Document {
  userId: Types.ObjectId;               // Linked User
  isMilitary: boolean;                  // Verification flag
  messages: Types.DocumentArray<IMessage>;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  messageCount: number;

  // Instance methods
  addMessage(content: string, senderId: Types.ObjectId): Promise<IMilitaryUser>;
  removeMessage(messageId: Types.ObjectId): Promise<boolean>;
}

// --- MilitaryUser Model Interface ---
export interface IMilitaryUserModel extends Model<IMilitaryUser> {
  findByUser(userId: Types.ObjectId): Promise<IMilitaryUser | null>;
  getMilitaryUsers(): Promise<IMilitaryUser[]>;
}

// --- Sub-Schema Definition ---
const MessageSchema = new Schema<IMessage>(
  {
    sender:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    content:  { type: String, required: true, trim: true },
    timestamp:{ type: Date,   default: Date.now }
  },
  { _id: true }
);

// --- Main Schema Definition ---
const MilitaryUserSchema = new Schema<IMilitaryUser, IMilitaryUserModel>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    isMilitary: { type: Boolean, default: false },
    messages:   { type: [MessageSchema], default: [] }
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// --- Indexes ---
// ensure one document per user
MilitaryUserSchema.index({ userId: 1 }, { unique: true });
// allow fast lookup of most recent messages
MilitaryUserSchema.index({ "messages.timestamp": -1 });

// --- Virtuals ---
MilitaryUserSchema.virtual("messageCount").get(function (this: IMilitaryUser): number {
  return this.messages.length;
});

// --- Instance Methods ---
MilitaryUserSchema.methods.addMessage = async function (
  this: IMilitaryUser,
  content: string,
  senderId: Types.ObjectId
): Promise<IMilitaryUser> {
  this.messages.push({ sender: senderId, content, timestamp: new Date() });
  await this.save();
  return this;
};

MilitaryUserSchema.methods.removeMessage = async function (
  this: IMilitaryUser,
  messageId: Types.ObjectId
): Promise<boolean> {
  const idx = this.messages.findIndex(m => m._id.equals(messageId));
  if (idx === -1) return false;
  this.messages.splice(idx, 1);
  await this.save();
  return true;
};

// --- Static Methods ---
MilitaryUserSchema.statics.findByUser = function (
  this: IMilitaryUserModel,
  userId: Types.ObjectId
): Promise<IMilitaryUser | null> {
  return this.findOne({ userId }).populate("messages.sender", "username profilePicture");
};

MilitaryUserSchema.statics.getMilitaryUsers = function (
  this: IMilitaryUserModel
): Promise<IMilitaryUser[]> {
  return this.find({ isMilitary: true }).sort({ updatedAt: -1 });
};

// --- Model Export ---
export const MilitaryUser = mongoose.model<IMilitaryUser, IMilitaryUserModel>(
  "MilitaryUser",
  MilitaryUserSchema
);
export default MilitaryUser;
