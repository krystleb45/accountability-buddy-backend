import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

// Define the APIKey interface extending Mongoose's Document
export interface APIKeyDocument extends Document {
  key: string;
  owner: mongoose.Types.ObjectId;
  permissions: ("read" | "write" | "delete" | "admin")[];
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
  status: string; // Virtual field
  deactivate: () => Promise<APIKeyDocument>;
  renew: (days?: number) => Promise<APIKeyDocument>;
  hasPermission: (permission: string) => boolean;
}

// Define static methods for the APIKey model
export interface APIKeyModel extends Model<APIKeyDocument> {
  validateKey: (apiKey: string) => Promise<APIKeyDocument | null>;
  generateKeyForUser: (
    userId: mongoose.Types.ObjectId,
    permissions?: ("read" | "write" | "delete" | "admin")[],
    expirationDays?: number
  ) => Promise<APIKeyDocument>;
}

// Define the APIKey schema
const APIKeySchema = new Schema<APIKeyDocument>(
  {
    key: {
      type: String,
      required: [true, "API key is required"],
      unique: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
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
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: (): Date =>
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days from creation
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes for efficient queries
APIKeySchema.index({ owner: 1, isActive: 1 });
APIKeySchema.index({ expiresAt: 1 });

// Virtual field for displaying the key's status
APIKeySchema.virtual("status").get(function (): string {
  return this.isActive ? "Active" : "Inactive";
});

// Pre-save hook to generate a secure API key before saving
APIKeySchema.pre("validate", function (next): void {
  if (!this.key) {
    this.key = crypto.randomBytes(32).toString("hex"); // Generate a 256-bit hex key
  }
  next();
});

APIKeySchema.methods.deactivate = async function (
  this: APIKeyDocument, // Explicitly define 'this' type
): Promise<APIKeyDocument> {
  this.isActive = false; // Set the API key as inactive
  await this.save(); // Save changes
  return this; // Return the updated document
};


// Static method to validate an API key
APIKeySchema.statics.validateKey = async function (
  apiKey: string,
): Promise<APIKeyDocument | null> {
  return this.findOne({
    key: apiKey,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });
};

// Static method to generate a new API key for a user
APIKeySchema.statics.generateKeyForUser = async function (
  userId: mongoose.Types.ObjectId,
  permissions: ("read" | "write" | "delete" | "admin")[] = ["read"],
  expirationDays = 30,
): Promise<APIKeyDocument> {
  const newKey = new this({
    key: crypto.randomBytes(32).toString("hex"), // Generate key here to ensure it's stored
    owner: userId,
    permissions,
    expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000),
  });
  await newKey.save();
  return newKey;
};

// Method to renew the expiration date of the API key
APIKeySchema.methods.renew = async function (
  this: APIKeyDocument, // Explicitly define 'this'
  days = 30,
): Promise<APIKeyDocument> {
  this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000); // Extend expiration
  await this.save(); // Save changes
  return this; // Return the updated document
};


// Method to check if the API key has specific permissions
APIKeySchema.methods.hasPermission = function (
  this: APIKeyDocument, // Explicitly define 'this'
  permission: "read" | "write" | "delete" | "admin", // Restrict parameter to match union type
): boolean {
  // Check permissions or admin access
  return (
    this.permissions.includes(permission) || this.permissions.includes("admin")
  );
};



// Export the APIKey model
const APIKey = mongoose.model<APIKeyDocument, APIKeyModel>("APIKey", APIKeySchema);

export default APIKey;
