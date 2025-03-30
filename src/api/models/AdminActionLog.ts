import type { Document, Model, CallbackError } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the AdminActionLog interface
export interface AdminActionLog extends Document {
  admin: mongoose.Types.ObjectId; // Reference to the admin user
  action:
    | "create_user"
    | "delete_user"
    | "update_user_role"
    | "suspend_user"
    | "create_goal"
    | "delete_goal"
    | "modify_subscription"
    | "view_reports"
    | "other"; // Allowed action types
  description?: string; // Optional description for the action
  target?: mongoose.Types.ObjectId; // Optional target user
  details: Map<string, string>; // Additional metadata
  ipAddress?: string; // Optional IP address
  createdAt: Date;
  updatedAt: Date;
  actionType: string; // Virtual field for a readable action type
}

// Define the AdminActionLog Schema
const AdminActionLogSchema = new Schema<AdminActionLog>(
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
      default: null, // Optional target
    },
    details: {
      type: Map,
      of: String, // Metadata as key-value pairs
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string): boolean {
          return /^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v); // Basic IPv4 validation
        },
        message: "Invalid IP address format",
      },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes for optimized queries
AdminActionLogSchema.index({ admin: 1, action: 1, createdAt: -1 });
AdminActionLogSchema.index({ target: 1 });
AdminActionLogSchema.index({ createdAt: -1 });

// Virtual field for a readable action type
AdminActionLogSchema.virtual("actionType").get(function (
  this: AdminActionLog,
): string {
  return this.action
    .replace("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
});

// Pre-save hook for action validation
AdminActionLogSchema.pre("save", function (
  next: (err?: CallbackError) => void,
): void {
  if (this.action === "other" && !this.description) {
    return next(
      new Error("Description is required for \"other\" action type"),
    );
  }
  next();
});


// Static method to log admin actions
AdminActionLogSchema.statics.logAction = async function (
  adminId: mongoose.Types.ObjectId,
  action: AdminActionLog["action"],
  targetId: mongoose.Types.ObjectId | null = null,
  description = "",
  details: Record<string, string> = {},
  ipAddress = "",
): Promise<AdminActionLog> {
  const newLog = new this({
    admin: adminId,
    action,
    target: targetId,
    description,
    details,
    ipAddress,
  });

  return newLog.save();
};

// Export the AdminActionLog model
const AdminActionLog: Model<AdminActionLog> = mongoose.model<AdminActionLog>(
  "AdminActionLog",
  AdminActionLogSchema,
);

export default AdminActionLog;
