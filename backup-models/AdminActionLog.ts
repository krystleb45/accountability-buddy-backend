// src/api/models/AdminActionLog.ts

import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Types & Interfaces ---
export type AdminAction =
  | "create_user"
  | "delete_user"
  | "update_user_role"
  | "suspend_user"
  | "create_goal"
  | "delete_goal"
  | "modify_subscription"
  | "view_reports"
  | "other";

export interface IAdminActionLog extends Document {
  admin: mongoose.Types.ObjectId;          // Admin user reference
  action: AdminAction;                     // Action type
  description?: string;                    // Optional description
  target?: mongoose.Types.ObjectId;        // Optional target user
  details: Map<string, string>;            // Additional metadata
  ipAddress?: string;                      // IP address of action
  createdAt: Date;
  updatedAt: Date;

  // Virtual
  actionType: string;

  // Instance helper
  getActionType(): string;
}

export interface IAdminActionLogModel extends Model<IAdminActionLog> {
  logAction(
    adminId: mongoose.Types.ObjectId,
    action: AdminAction,
    targetId?: mongoose.Types.ObjectId | null,
    description?: string,
    details?: Record<string, string>,
    ipAddress?: string
  ): Promise<IAdminActionLog>;
}

// --- Schema Definition ---
// Note: pass both Document and Model interface here
const AdminActionLogSchema = new Schema<IAdminActionLog, IAdminActionLogModel>(
  {
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Admin reference is required"],
    },
    action: {
      type: String,
      enum: [
        "create_user",
        "delete_user",
        "update_user_role",
        "suspend_user",
        "create_goal",
        "delete_goal",
        "modify_subscription",
        "view_reports",
        "other",
      ],
      required: [true, "Action type is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    target: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    details: {
      type: Map,
      of: String,
      default: (): Map<string, string> => new Map<string, string>(),
    },
    ipAddress: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string): boolean =>
          /^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v),
        message: "Invalid IP address format",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes (only here) ---
AdminActionLogSchema.index({ admin: 1, action: 1, createdAt: -1 });
AdminActionLogSchema.index({ target: 1 });
AdminActionLogSchema.index({ createdAt: -1 });
AdminActionLogSchema.index({ ipAddress: 1 });

// --- Virtuals ---
AdminActionLogSchema.virtual("actionType").get(function (this: IAdminActionLog): string {
  return this.action
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
});

// --- Instance Methods ---
AdminActionLogSchema.methods.getActionType = function (): string {
  return this.actionType;
};

// --- Pre-save Hook ---
AdminActionLogSchema.pre<IAdminActionLog>("save", function (next) {
  if (this.action === "other" && !this.description) {
    return next(new Error("Description is required for 'other' action type"));
  }
  next();
});

// --- Static Methods ---
AdminActionLogSchema.statics.logAction = async function (
  this: IAdminActionLogModel,
  adminId: mongoose.Types.ObjectId,
  action: AdminAction,
  targetId: mongoose.Types.ObjectId | null = null,
  description = "",
  details: Record<string, string> = {},
  ipAddress = ""
): Promise<IAdminActionLog> {
  const entry = new this({
    admin: adminId,
    action,
    target: targetId,
    description,
    details,
    ipAddress,
  });
  return entry.save();
};

// --- Model Export ---
export const AdminActionLog = mongoose.model<IAdminActionLog, IAdminActionLogModel>(
  "AdminActionLog",
  AdminActionLogSchema
);

export default AdminActionLog;
