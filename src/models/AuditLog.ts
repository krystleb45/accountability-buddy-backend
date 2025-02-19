import type { Document, CallbackError } from "mongoose";
import mongoose, { Schema } from "mongoose";
import validator from "validator";
import logger from "../utils/winstonLogger";

export interface IAuditTrail extends Document {
  userId?: mongoose.Types.ObjectId;
  entityType: "User" | "Goal" | "Task" | "Subscription" | "Payment";
  entityId: mongoose.Types.ObjectId;
  action: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const AuditTrailSchema: Schema<IAuditTrail> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    entityType: {
      type: String,
      required: [true, "Entity type is required"],
      enum: ["User", "Goal", "Task", "Subscription", "Payment"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Entity ID is required"],
    },
    action: {
      type: String,
      required: [true, "Action is required"],
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    ipAddress: {
      type: String,
      validate: [validator.isIP, "Invalid IP address format"],
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

AuditTrailSchema.index({ action: 1, createdAt: -1 });

AuditTrailSchema.pre<IAuditTrail>("save", function (this: IAuditTrail, next: (err?: CallbackError) => void) {
  try {
    if (!this.userId && !this.ipAddress) {
      const error = new Error("Either userId or ipAddress must be provided.");
      logger.error(`AuditTrail validation error: ${error.message}`);
      return next(error);
    }
    next();
  } catch (error) {
    const err = error as Error;
    logger.error(`Unexpected error in AuditTrail pre-save hook: ${err.message}`);
    next(err);
  }
});

AuditTrailSchema.post<IAuditTrail>("save", function (this: IAuditTrail, doc: IAuditTrail) {
  logger.info(
    `AuditTrail created for ${doc.entityType} ${doc.entityId}: ${doc.action} by user ${doc.userId || "Unknown"} at ${doc.createdAt}`,
  );
});

AuditTrailSchema.post<IAuditTrail>("save", function (
  this: IAuditTrail,
  error: CallbackError,
  doc: IAuditTrail,
  next: (err?: CallbackError) => void,
) {
  try {
    const err = error as Error;
    logger.error(
      `Error saving AuditTrail for ${doc.entityType} ${doc.entityId}: ${err.message}`,
    );
    next(error);
  } catch (caughtErr) {
    const err = caughtErr as Error;
    logger.error(`Unexpected error in AuditTrail post-save error hook: ${err.message}`);
    next(err);
  }
});

const AuditTrail = mongoose.model<IAuditTrail>("AuditTrail", AuditTrailSchema);
export default AuditTrail;
