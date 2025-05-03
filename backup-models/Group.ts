// src/api/models/Group.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Subdocument for unread message counts ---
export interface IUnreadMessage {
  userId: Types.ObjectId;
  count: number;
}

// --- Main Interface ---
export interface IGroup extends Document {
  name: string;
  description?: string;
  members: Types.ObjectId[];
  createdBy: Types.ObjectId;
  visibility: "public" | "private";
  isActive: boolean;
  unreadMessages: Types.DocumentArray<IUnreadMessage>;
  typingUsers: Types.ObjectId[];
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  memberCount: number;
  typingCount: number;

  // Instance methods
  addMember(userId: Types.ObjectId): Promise<IGroup>;
  removeMember(userId: Types.ObjectId): Promise<IGroup>;
  incrementUnread(userId: Types.ObjectId): Promise<IGroup>;
  clearUnread(userId: Types.ObjectId): Promise<IGroup>;
}

// --- Model Interface ---
export interface IGroupModel extends Model<IGroup> {
  findPublicGroups(): Promise<IGroup[]>;
}

// --- Subschemas ---
const UnreadSchema = new Schema<IUnreadMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

// --- Main Schema ---
const GroupSchema = new Schema<IGroup, IGroupModel>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
    isActive: { type: Boolean, default: true },
    unreadMessages: { type: [UnreadSchema], default: [] },
    typingUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isPinned: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
GroupSchema.index({ name: 1, isActive: 1 });
GroupSchema.index({ members: 1 });
GroupSchema.index({ visibility: 1 });
GroupSchema.index({ "unreadMessages.userId": 1 });

// --- Virtuals ---
GroupSchema.virtual("memberCount").get(function (this: IGroup): number {
  return this.members.length;
});

GroupSchema.virtual("typingCount").get(function (this: IGroup): number {
  return this.typingUsers.length;
});

// --- Middleware ---
GroupSchema.pre<IGroup>("save", function (next: (err?: Error) => void): void {
  if (!this.members.some((m) => m.equals(this.createdBy))) {
    this.members.push(this.createdBy);
  }
  next();
});

// --- Instance Methods ---
GroupSchema.methods.addMember = async function (
  this: IGroup,
  userId: Types.ObjectId
): Promise<IGroup> {
  if (!this.members.some((m) => m.equals(userId))) {
    this.members.push(userId);
    await this.save();
  }
  return this;
};

GroupSchema.methods.removeMember = async function (
  this: IGroup,
  userId: Types.ObjectId
): Promise<IGroup> {
  this.members = this.members.filter((m) => !m.equals(userId));
  await this.save();
  return this;
};

GroupSchema.methods.incrementUnread = async function (
  this: IGroup,
  userId: Types.ObjectId
): Promise<IGroup> {
  const um = this.unreadMessages.find((u) => u.userId.equals(userId));
  if (um) {
    um.count += 1;
  } else {
    this.unreadMessages.push({ userId, count: 1 });
  }
  await this.save();
  return this;
};

GroupSchema.methods.clearUnread = async function (
  this: IGroup,
  userId: Types.ObjectId
): Promise<IGroup> {
  const um = this.unreadMessages.find((u) => u.userId.equals(userId));
  if (um) {
    um.count = 0;
    await this.save();
  }
  return this;
};

// --- Static Methods ---
GroupSchema.statics.findPublicGroups = function (this: IGroupModel): Promise<IGroup[]> {
  return this.find({ visibility: "public", isActive: true })
    .sort({ createdAt: -1 })
    .exec();
};

// --- Model Export ---
export const Group = mongoose.model<IGroup, IGroupModel>("Group", GroupSchema);
export default Group;
