// src/api/models/MilitarySupportChatroom.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Chatroom Interface ---
export interface IMilitarySupportChatroom extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  members: Types.ObjectId[];            // Users in the room
  visibility: "public" | "private";     // Access control
  isActive: boolean;                    // Soft-delete flag
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  memberCount: number;

  // Instance methods
  addMember(userId: Types.ObjectId): Promise<IMilitarySupportChatroom>;
  removeMember(userId: Types.ObjectId): Promise<IMilitarySupportChatroom>;
  deactivate(): Promise<IMilitarySupportChatroom>;
  activate(): Promise<IMilitarySupportChatroom>;
}

// --- Model Interface ---
export interface IMilitarySupportChatroomModel extends Model<IMilitarySupportChatroom> {
  findPublic(): Promise<IMilitarySupportChatroom[]>;
  findByMember(userId: Types.ObjectId): Promise<IMilitarySupportChatroom[]>;
}

// --- Schema Definition ---
const MilitarySupportChatroomSchema = new Schema<
  IMilitarySupportChatroom,
  IMilitarySupportChatroomModel
>(
  {
    name: {
      type: String,
      required: [true, "Chatroom name is required."],
      unique: true,
      trim: true,
      minlength: [3, "Chatroom name must be at least 3 characters."],
      maxlength: [100, "Chatroom name cannot exceed 100 characters."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters."],
      default: "",
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
MilitarySupportChatroomSchema.index({ name: "text", description: "text" });
MilitarySupportChatroomSchema.index({ members: 1 });
MilitarySupportChatroomSchema.index({ visibility: 1 });
MilitarySupportChatroomSchema.index({ isActive: 1 });

// --- Virtual for member count ---
MilitarySupportChatroomSchema.virtual("memberCount").get(function (
  this: IMilitarySupportChatroom
): number {
  return this.members.length;
});

// --- Instance Methods ---
MilitarySupportChatroomSchema.methods.addMember = async function (
  this: IMilitarySupportChatroom,
  userId: Types.ObjectId
): Promise<IMilitarySupportChatroom> {
  if (!this.members.some((m) => m.equals(userId))) {
    this.members.push(userId);
    await this.save();
  }
  return this;
};

MilitarySupportChatroomSchema.methods.removeMember = async function (
  this: IMilitarySupportChatroom,
  userId: Types.ObjectId
): Promise<IMilitarySupportChatroom> {
  this.members = this.members.filter((m) => !m.equals(userId));
  await this.save();
  return this;
};

MilitarySupportChatroomSchema.methods.deactivate = async function (
  this: IMilitarySupportChatroom
): Promise<IMilitarySupportChatroom> {
  this.isActive = false;
  await this.save();
  return this;
};

MilitarySupportChatroomSchema.methods.activate = async function (
  this: IMilitarySupportChatroom
): Promise<IMilitarySupportChatroom> {
  this.isActive = true;
  await this.save();
  return this;
};

// --- Static Methods ---
MilitarySupportChatroomSchema.statics.findPublic = function (): Promise<
  IMilitarySupportChatroom[]
  > {
  return this.find({ visibility: "public", isActive: true }).sort({
    createdAt: -1,
  });
};

MilitarySupportChatroomSchema.statics.findByMember = function (
  userId: Types.ObjectId
): Promise<IMilitarySupportChatroom[]> {
  return this.find({
    members: userId,
    isActive: true,
  }).sort({ updatedAt: -1 });
};

// --- Model Export ---
export const MilitarySupportChatroom = mongoose.model<
  IMilitarySupportChatroom,
  IMilitarySupportChatroomModel
>("MilitarySupportChatroom", MilitarySupportChatroomSchema);

export default MilitarySupportChatroom;
