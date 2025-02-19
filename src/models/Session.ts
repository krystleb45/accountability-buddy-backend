import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import validator from "validator"; // For validating IP addresses

// Define the Session interface
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

  // Methods
  invalidateSession: () => Promise<void>;
}

// Extend the model interface for static methods
interface ISessionModel extends Model<ISession> {
  invalidateUserSessions: (userId: Types.ObjectId) => Promise<void>;
}

// Define the Session schema
const SessionSchema = new Schema<ISession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for faster lookups by user
    },
    token: {
      type: String,
      required: true,
      unique: true, // Ensure session tokens are unique
      index: true, // Index for faster session retrieval
    },
    ipAddress: {
      type: String,
      validate: {
        validator: (value: string): boolean => validator.isIP(value),
        message: "Invalid IP address format",
      },
      trim: true,
    },
    device: {
      type: String,
      maxlength: 100, // Limit device description length for better performance
      trim: true,
    },
    userAgent: {
      type: String, // Store additional device info (e.g., browser, OS)
      maxlength: 255,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true, // Track if the session is active
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true, // Index for quick expiration queries
    },
  },
  {
    timestamps: true, // Automatically create 'createdAt' and 'updatedAt' fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Index for optimized queries by user and expiration date
SessionSchema.index({ user: 1, expiresAt: 1 });

// Middleware: Pre-save hook to trim fields and check expiration
SessionSchema.pre<ISession>("save", function (next): void {
  if (this.ipAddress) this.ipAddress = this.ipAddress.trim();
  if (this.device) this.device = this.device.trim();
  if (this.userAgent) this.userAgent = this.userAgent.trim();

  // Deactivate expired sessions
  if (this.expiresAt.getTime() <= Date.now()) {
    this.isActive = false;
  }
  next();
});

// Virtual: Check if the session is expired
SessionSchema.virtual("isExpired").get(function (): boolean {
  return this.expiresAt.getTime() <= Date.now();
});

// Method: Invalidate this session
SessionSchema.methods.invalidateSession = async function (): Promise<void> {
  this.isActive = false;
  await this.save();
};

// Static Method: Invalidate all sessions for a user
SessionSchema.statics.invalidateUserSessions = async function (
  userId: Types.ObjectId,
): Promise<void> {
  await this.updateMany(
    { user: userId, isActive: true },
    { isActive: false },
  );
};

// Export the Session model
export const Session: ISessionModel = mongoose.model<ISession, ISessionModel>(
  "Session",
  SessionSchema,
);
