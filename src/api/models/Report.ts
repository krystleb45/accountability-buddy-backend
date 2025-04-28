import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Report Document Interface ---
export interface IReport extends Document {
  userId: Types.ObjectId;       // Reporter
  reportedId: Types.ObjectId;   // ID of the entity reported (post, comment, user)
  reportType: "post" | "comment" | "user";
  reason: string;
  status: "pending" | "resolved";
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  resolve(resolverId: Types.ObjectId): Promise<IReport>;
}

// --- Report Model Static Interface ---
export interface IReportModel extends Model<IReport> {
  getByUser(userId: Types.ObjectId): Promise<IReport[]>;
  getPending(): Promise<IReport[]>;
  resolveReport(reportId: string, resolverId: Types.ObjectId): Promise<IReport>;
}

// --- Schema Definition ---
const ReportSchema = new Schema<IReport, IReportModel, IReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reportedId: { type: Schema.Types.ObjectId, required: true, index: true },
    reportType: {
      type: String,
      enum: ["post", "comment", "user"],
      required: true,
      index: true,
    },
    reason: { type: String, required: true, maxlength: 300 },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
      index: true,
    },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// --- Indexes ---
ReportSchema.index({ userId: 1 });
ReportSchema.index({ reportedId: 1 });
ReportSchema.index({ status: 1 });

// --- Instance Methods ---
ReportSchema.methods.resolve = async function (
  this: IReport,
  resolverId: Types.ObjectId
): Promise<IReport> {
  this.status = "resolved";
  this.resolvedBy = resolverId;
  this.resolvedAt = new Date();
  return this.save();
};

// --- Static Methods ---
ReportSchema.statics.getByUser = function (
  this: IReportModel,
  userId: Types.ObjectId
): Promise<IReport[]> {
  return this.find({ userId }).sort({ createdAt: -1 }).exec();
};

ReportSchema.statics.getPending = function (
  this: IReportModel
): Promise<IReport[]> {
  return this.find({ status: "pending" }).sort({ createdAt: 1 }).exec();
};

ReportSchema.statics.resolveReport = async function (
  this: IReportModel,
  reportId: string,
  resolverId: Types.ObjectId
): Promise<IReport> {
  const report = await this.findById(reportId);
  if (!report) {
    throw new Error("Report not found");
  }
  return report.resolve(resolverId);
};

// --- Model Export ---
export const Report = mongoose.model<IReport, IReportModel>(
  "Report",
  ReportSchema
);

export default Report;
