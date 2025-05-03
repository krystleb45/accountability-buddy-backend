// src/api/models/Session.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import validator from "validator";

// --- Session Document Interface ---
export interface ISession extends Document {
  user: Types.ObjectId;
  token: string;
  ipAddress?: string;
  device?: string;
  userAgent?: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtual field
  isExpired: boolean;

  // Instance methods
  invalidateSession(): Promise<ISession>;
}

// --- Session Model Static Interface ---
export interface ISessionModel extends Model<ISession> {
  invalidateUserSessions(userId: Types.ObjectId): Promise<void>;
  findActiveSessions(userId: Types.ObjectId): Promise<ISession[]>;
}

// --- Schema Definition ---
const SessionSchema = new Schema<ISession, ISessionModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      validate: {
        validator: (value: string): boolean => (value ? validator.isIP(value) : true),
        message: "Invalid IP address format",
      },
    },
    device: {
      type: String,
      trim: true,
      maxlength: [100, "Device string cannot exceed 100 characters"],
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: [255, "UserAgent cannot exceed 255 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
SessionSchema.index({ user: 1, expiresAt: 1 });
SessionSchema.index({ isActive: 1 });
SessionSchema.index({ token: 1 });

// --- Virtuals ---
SessionSchema.virtual("isExpired").get(function (this: ISession): boolean {
  return this.expiresAt.getTime() <= Date.now();
});

// --- Middleware ---
SessionSchema.pre<ISession>("save", function (next): void {
  if (this.ipAddress) this.ipAddress = this.ipAddress.trim();
  if (this.device) this.device = this.device.trim();
  if (this.userAgent) this.userAgent = this.userAgent.trim();

  if (this.expiresAt.getTime() <= Date.now()) {
    this.isActive = false;
  }
  next();
});

// --- Instance Methods ---
SessionSchema.methods.invalidateSession = async function (this: ISession): Promise<ISession> {
  this.isActive = false;
  return this.save();
};

// --- Static Methods ---
SessionSchema.statics.invalidateUserSessions = async function (
  this: ISessionModel,
  userId: Types.ObjectId
): Promise<void> {
  await this.updateMany({ user: userId, isActive: true }, { isActive: false }).exec();
};

SessionSchema.statics.findActiveSessions = function (
  this: ISessionModel,
  userId: Types.ObjectId
): Promise<ISession[]> {
  return this.find({ user: userId, isActive: true }).sort({ expiresAt: 1 }).exec();
};

// --- Model Export ---
export const Session = mongoose.model<ISession, ISessionModel>("Session", SessionSchema);
export default Session;
