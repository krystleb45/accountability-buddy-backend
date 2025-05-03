// src/api/models/Activity.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Types & Interfaces ---
export type ActivityType =
  | "goal"
  | "reminder"
  | "post"
  | "message"
  | "login"
  | "logout"
  | "signup"
  | "friend_request"
  | "friend_accept"
  | "comment"
  | "reaction"
  | "achievement";

export interface IActivity extends Document {
  user: Types.ObjectId;
  type: ActivityType;
  description?: string;
  metadata: Record<string, any>;
  participants: Types.ObjectId[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addParticipant(userId: Types.ObjectId): Promise<void>;
  markDeleted(): Promise<void>;
}

export interface IActivityModel extends Model<IActivity> {
  getRecentForUser(userId: Types.ObjectId, limit: number): Promise<IActivity[]>;
  getByType(type: ActivityType): Promise<IActivity[]>;
  softDeleteByUser(userId: Types.ObjectId): Promise<{ deletedCount?: number }>;
}

// --- Schema Definition ---
const ActivitySchema = new Schema<IActivity>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "goal",
        "reminder",
        "post",
        "message",
        "login",
        "logout",
        "signup",
        "friend_request",
        "friend_accept",
        "comment",
        "reaction",
        "achievement",
      ],
      required: true,
    },
    description: { type: String, trim: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    participants: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ type: 1 });
ActivitySchema.index({ isDeleted: 1 });

// --- Pre-save Hook ---
ActivitySchema.pre<IActivity>("save", function (next) {
  if (this.isModified("description") && this.description) {
    this.description = this.description.trim();
  }
  next();
});

// --- Instance Methods ---
ActivitySchema.methods.addParticipant = async function (userId: Types.ObjectId): Promise<void> {
  if (!this.participants.some((p: { equals: (arg0: Types.ObjectId) => any; }) => p.equals(userId))) {
    this.participants.push(userId);
    await this.save();
  }
};

ActivitySchema.methods.markDeleted = async function (): Promise<void> {
  this.isDeleted = true;
  await this.save();
};

// --- Static Methods ---
ActivitySchema.statics.getRecentForUser = function (
  userId: Types.ObjectId,
  limit: number
): Promise<IActivity[]> {
  return this.find({ user: userId, isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

ActivitySchema.statics.getByType = function (type: ActivityType): Promise<IActivity[]> {
  return this.find({ type, isDeleted: false })
    .sort({ createdAt: -1 })
    .exec();
};

ActivitySchema.statics.softDeleteByUser = function (
  userId: Types.ObjectId
): Promise<{ deletedCount?: number }> {
  return this.updateMany({ user: userId, isDeleted: false }, { $set: { isDeleted: true } }).exec();
};

// --- Model Export ---
export const Activity = mongoose.model<IActivity, IActivityModel>("Activity", ActivitySchema);
export default Activity;
