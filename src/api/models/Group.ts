// src/api/models/Group.ts - Updated with new fields

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
  category: string; // Added
  members: Types.ObjectId[];
  createdBy: Types.ObjectId;
  visibility: "public" | "private";
  isPublic: boolean; // Added (derived from visibility)
  inviteOnly: boolean; // Added
  isActive: boolean;
  lastActivity: Date; // Added
  avatar?: string; // Added
  tags: string[]; // Added
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
    category: {
      type: String,
      required: true,
      enum: [
        "Fitness & Health",
        "Learning & Education",
        "Career & Business",
        "Lifestyle & Hobbies",
        "Creative & Arts",
        "Technology"
      ],
      default: "Learning & Education"
    },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
    isPublic: { type: Boolean, default: true }, // Added
    inviteOnly: { type: Boolean, default: false }, // Added
    isActive: { type: Boolean, default: true },
    lastActivity: { type: Date, default: Date.now }, // Added
    avatar: { type: String, default: null }, // Added
    tags: { type: [String], default: [], maxlength: 5 }, // Added
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
GroupSchema.index({ category: 1 }); // Added
GroupSchema.index({ isPublic: 1 }); // Added
GroupSchema.index({ lastActivity: -1 }); // Added
GroupSchema.index({ tags: 1 }); // Added
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

  // Sync isPublic with visibility
  this.isPublic = this.visibility === "public";

  // Update lastActivity on save
  if (this.isModified("members") || this.isNew) {
    this.lastActivity = new Date();
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
    this.lastActivity = new Date();
    await this.save();
  }
  return this;
};

GroupSchema.methods.removeMember = async function (
  this: IGroup,
  userId: Types.ObjectId
): Promise<IGroup> {
  this.members = this.members.filter((m) => !m.equals(userId));
  this.lastActivity = new Date();
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
    .sort({ lastActivity: -1 }) // Changed to sort by lastActivity
    .exec();
};

// --- Model Export ---
export const Group = mongoose.model<IGroup, IGroupModel>("Group", GroupSchema);
export default Group;
