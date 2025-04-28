import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

// --- RefreshToken Document Interface ---
export interface IRefreshToken extends Document {
  user: Types.ObjectId;        // Reference to User
  token: string;               // Secure random token
  expiresAt: Date;             // Expiration date
  revoked: boolean;            // Token revoked flag
  createdAt: Date;             // Auto-generated
  updatedAt: Date;             // Auto-generated

  // Virtuals
  isExpired: boolean;
  isActive: boolean;

  // Instance methods
  revoke(): Promise<IRefreshToken>;
}

// --- RefreshToken Model Static Interface ---
export interface IRefreshTokenModel extends Model<IRefreshToken> {
  generate(userId: Types.ObjectId, expiresInSeconds?: number): Promise<IRefreshToken>;
  findValid(token: string): Promise<IRefreshToken | null>;
  revokeToken(token: string): Promise<void>;
  removeExpired(): Promise<{ deletedCount?: number }>;
}

// --- Schema Definition ---
const RefreshTokenSchema = new Schema<IRefreshToken, IRefreshTokenModel, IRefreshToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },  // TTL index, expiresAt will control deletion
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Virtual Fields ---
RefreshTokenSchema.virtual("isExpired").get(function (this: IRefreshToken): boolean {
  return this.expiresAt <= new Date();
});

RefreshTokenSchema.virtual("isActive").get(function (this: IRefreshToken): boolean {
  return !this.revoked && !this.isExpired;
});

// --- Instance Methods ---
RefreshTokenSchema.methods.revoke = async function (this: IRefreshToken): Promise<IRefreshToken> {
  this.revoked = true;
  await this.save();
  return this;
};

// --- Static Methods ---
/**
 * Generate and save a new refresh token for a user
 */
RefreshTokenSchema.statics.generate = async function (
  userId: Types.ObjectId,
  expiresInSeconds = 60 * 60 * 24 * 30 // 30 days
): Promise<IRefreshToken> {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const doc = await this.create({ user: userId, token, expiresAt });
  return doc;
};

/**
 * Find a token if still active (not expired or revoked)
 */
RefreshTokenSchema.statics.findValid = function (
  token: string
): Promise<IRefreshToken | null> {
  return this.findOne({ token, revoked: false, expiresAt: { $gt: new Date() } });
};

/**
 * Revoke a token by string
 */
RefreshTokenSchema.statics.revokeToken = async function (
  token: string
): Promise<void> {
  const doc = await this.findOne({ token });
  if (doc) {
    doc.revoked = true;
    await doc.save();
  }
};

/**
 * Remove expired tokens from database
 */
RefreshTokenSchema.statics.removeExpired = function (): Promise<{ deletedCount?: number }> {
  return this.deleteMany({ expiresAt: { $lte: new Date() } });
};

// --- Model Export ---
export const RefreshToken = mongoose.model<IRefreshToken, IRefreshTokenModel>(
  "RefreshToken",
  RefreshTokenSchema
);

export default RefreshToken;
