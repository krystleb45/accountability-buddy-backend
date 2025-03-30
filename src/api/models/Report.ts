import type { Document, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

/**
 * @desc Interface for the Report model.
 */
export interface IReport extends Document {
  userId: Types.ObjectId; // Changed from string to Types.ObjectId
  reportedId: Types.ObjectId; // Changed from string to Types.ObjectId
  reportType: "post" | "comment" | "user"; // Narrowed down string to these enums
  reason: string;
  status: "pending" | "resolved"; // Narrow the string type to these statuses
  resolvedBy?: Types.ObjectId; // If this references another user, also make it Types.ObjectId
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @desc Schema for the Report model.
 */
const ReportSchema = new Schema<IReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reportedId: { type: Schema.Types.ObjectId, required: true },
    reportType: { type: String, enum: ["post", "comment", "user"], required: true },
    reason: { type: String, required: true, maxlength: 300 },
    status: { type: String, enum: ["pending", "resolved"], default: "pending" },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

/**
 * @desc Create and export the Report model.
 */
const Report = mongoose.model<IReport>("Report", ReportSchema);

export default Report;
