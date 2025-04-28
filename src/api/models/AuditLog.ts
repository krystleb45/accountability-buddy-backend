import type { Document, Model, CallbackError, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import validator from "validator";
import { logger } from "../../utils/winstonLogger";

// --- Types & Interfaces ---
export type EntityType = "User" | "Goal" | "Task" | "Subscription" | "Payment";

export interface IAuditTrail extends Document {
  userId?: Types.ObjectId;
  entityType: EntityType;
  entityId: Types.ObjectId;
  action: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;  // set by mongoose timestamps
  updatedAt: Date;  // set by mongoose timestamps
}

export interface IAuditTrailModel extends Model<IAuditTrail> {
  logEvent(
    userId: Types.ObjectId | null,
    entityType: EntityType,
    entityId: Types.ObjectId,
    action: string,
    description?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<IAuditTrail>;
}

// --- Schema Definition ---
const AuditTrailSchema = new Schema<IAuditTrail>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },
    entityType: {
      type: String,
      enum: ["User", "Goal", "Task", "Subscription", "Payment"],
      required: [true, "Entity type is required"],
      index: true
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, "Entity ID is required"],
      index: true
    },
    action: {
      type: String,
      required: [true, "Action is required"],
      maxlength: [100, "Action length cannot exceed 100 characters"]
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"]
    },
    ipAddress: {
      type: String,
      validate: {
        validator: (v: string): boolean => validator.isIP(v),
        message: "Invalid IP address format"
      }
    },
    userAgent: { type: String, trim: true }
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false }
  }
);

// --- Indexes ---
AuditTrailSchema.index({ action: 1, createdAt: -1 });

// --- Pre-save Hook ---
AuditTrailSchema.pre<IAuditTrail>(
  "save",
  function (this: IAuditTrail, next: (err?: CallbackError) => void): void {
    if (!this.userId && !this.ipAddress) {
      const error = new Error("Either userId or ipAddress must be provided.");
      logger.error(`AuditTrail validation error: ${error.message}`);
      return next(error);
    }
    next();
  }
);

// --- Post-save Hooks ---
AuditTrailSchema.post<IAuditTrail>(
  "save",
  function (this: IAuditTrail): void {
    logger.info(
      `AuditTrail created for ${this.entityType} ${this.entityId}: ${this.action} by user ${
        this.userId || "Unknown"
      } at ${this.createdAt.toISOString()}`
    );
  }
);

AuditTrailSchema.post<IAuditTrail>(
  "save",
  function (
    this: IAuditTrail,
    error: CallbackError,
    doc: IAuditTrail,
    next: (err?: CallbackError) => void
  ): void {
    if (error) {
      logger.error(
        `Error saving AuditTrail for ${doc.entityType} ${doc.entityId}: ${error.message}`
      );
    }
    next(error);
  }
);

// --- Static Methods ---
AuditTrailSchema.statics.logEvent = async function (
  userId: Types.ObjectId | null,
  entityType: EntityType,
  entityId: Types.ObjectId,
  action: string,
  description = "",
  ipAddress = "",
  userAgent = ""
): Promise<IAuditTrail> {
  const entry = new this({ userId, entityType, entityId, action, description, ipAddress, userAgent });
  return entry.save();
};

// --- Model Export ---
export const AuditTrail = mongoose.model<IAuditTrail, IAuditTrailModel>(
  "AuditTrail",
  AuditTrailSchema
);

export default AuditTrail;
