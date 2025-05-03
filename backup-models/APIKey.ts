// src/api/models/APIKey.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

// --- Types & Interfaces ---
export type Permission = "read" | "write" | "delete" | "admin";

export interface IAPIKey extends Document {
  key: string;
  owner: Types.ObjectId;
  permissions: Permission[];
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtual
  status: string;

  // Instance methods
  deactivate(this: IAPIKey): Promise<IAPIKey>;
  renew(this: IAPIKey, days?: number): Promise<IAPIKey>;
  hasPermission(this: IAPIKey, permission: Permission): boolean;
}

export interface IAPIKeyModel extends Model<IAPIKey> {
  validateKey(apiKey: string): Promise<IAPIKey | null>;
  generateKeyForUser(
    userId: Types.ObjectId,
    permissions?: Permission[],
    expirationDays?: number
  ): Promise<IAPIKey>;
}

// --- Schema Definition ---
const APIKeySchema = new Schema<IAPIKey>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    permissions: {
      type: [String],
      enum: ["read", "write", "delete", "admin"],
      default: ["read"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: (): Date =>
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes (all in one place) ---
APIKeySchema.index({ owner: 1, isActive: 1 });
APIKeySchema.index({ expiresAt: 1 });

// --- Virtuals ---
APIKeySchema.virtual("status").get(function (this: IAPIKey): string {
  if (!this.isActive) return "Inactive";
  return this.expiresAt.getTime() > Date.now() ? "Active" : "Expired";
});

// --- Pre‑validate Hook ---
APIKeySchema.pre<IAPIKey>("validate", function (next) {
  if (!this.key) {
    this.key = crypto.randomBytes(32).toString("hex");
  }
  next();
});

// --- Instance Methods ---
APIKeySchema.methods.deactivate = async function (
  this: IAPIKey
): Promise<IAPIKey> {
  this.isActive = false;
  await this.save();
  // assert to IAPIKey so TS knows the returned document has all IAPIKey fields
  return this as IAPIKey;
};

APIKeySchema.methods.renew = async function (
  this: IAPIKey,
  days = 30
): Promise<IAPIKey> {
  this.expiresAt = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  );
  this.isActive = true;
  await this.save();
  return this as IAPIKey;
};

APIKeySchema.methods.hasPermission = function (
  permission: Permission
): boolean {
  return (
    this.permissions.includes(permission) ||
    this.permissions.includes("admin")
  );
};

// --- Static Methods ---
APIKeySchema.statics.validateKey = async function (
  apiKey: string
): Promise<IAPIKey | null> {
  return this.findOne({
    key: apiKey,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });
};

APIKeySchema.statics.generateKeyForUser = async function (
  userId: Types.ObjectId,
  permissions: Permission[] = ["read"],
  expirationDays = 30
): Promise<IAPIKey> {
  const keyString = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + expirationDays * 24 * 60 * 60 * 1000
  );
  const newKey = new this({
    key: keyString,
    owner: userId,
    permissions,
    expiresAt,
  });
  await newKey.save();
  return newKey;
};

// --- Model Export ---
export const APIKey = mongoose.model<IAPIKey, IAPIKeyModel>(
  "APIKey",
  APIKeySchema
);

export default APIKey;
