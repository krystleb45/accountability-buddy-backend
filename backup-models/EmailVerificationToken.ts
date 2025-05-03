// src/api/models/EmailVerificationToken.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

// --- Interface for a single token document ---
export interface IEmailVerificationToken extends Document {
  user: Types.ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance method to check expiration
  isExpired(): boolean;
}

// --- Model interface for our statics ---
export interface IEmailVerificationTokenModel
  extends Model<IEmailVerificationToken> {
  /**
   * Create a new token for `userId`, valid for `expiresInHours` (default 24h).
   */
  generate(
    userId: Types.ObjectId,
    expiresInHours?: number
  ): Promise<IEmailVerificationToken>;

  /**
   * Look up a token string and ensure it's not expired.
   */
  findValid(token: string): Promise<IEmailVerificationToken | null>;
}

// --- Schema definition ---
const EmailVerificationTokenSchema = new Schema<
  IEmailVerificationToken,
  IEmailVerificationTokenModel
>(
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
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// — TTL index so Mongo will auto-delete expired docs —
EmailVerificationTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// — For fast lookups by user if you ever need it —
EmailVerificationTokenSchema.index({ user: 1 });

// — And by token string for quick findValid() —
EmailVerificationTokenSchema.index({ token: 1 });

// --- Instance method implementation ---
EmailVerificationTokenSchema.methods.isExpired = function (
  this: IEmailVerificationToken
): boolean {
  return this.expiresAt.getTime() <= Date.now();
};

// --- Static method: generate a new token ---
EmailVerificationTokenSchema.statics.generate = async function (
  this: IEmailVerificationTokenModel,
  userId: Types.ObjectId,
  expiresInHours = 24
): Promise<IEmailVerificationToken> {
  const tokenString = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

  const doc = new this({ user: userId, token: tokenString, expiresAt });
  await doc.save();
  return doc;
};

// --- Static method: find only non‐expired token docs ---
EmailVerificationTokenSchema.statics.findValid = async function (
  this: IEmailVerificationTokenModel,
  token: string
): Promise<IEmailVerificationToken | null> {
  const doc = await this.findOne({ token });
  if (!doc || doc.isExpired()) return null;
  return doc;
};

// --- Export the model ---
export const EmailVerificationToken = mongoose.model<
  IEmailVerificationToken,
  IEmailVerificationTokenModel
>("EmailVerificationToken", EmailVerificationTokenSchema);

export default EmailVerificationToken;
