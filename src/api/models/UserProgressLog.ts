import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

/** Allowed types of things whose progress we log */
export type ProgressTargetType = "goal" | "task" | "tracker";

/** Document interface */
export interface IUserProgressLog extends Document {
  user: Types.ObjectId;               // Who made the change
  targetType: ProgressTargetType;     // e.g. "goal", "task", "tracker"
  targetId: Types.ObjectId;           // The specific goal/task/tracker ID
  before: number;                     // Progress value before the change
  after: number;                      // Progress value after the change
  note?: string;                      // Optional context or comment
  createdAt: Date;                    // When it was logged

  /** Handy summary for display or debugging */
  summary(): string;
}

/** Model interface for statics */
export interface IUserProgressLogModel extends Model<IUserProgressLog> {
  /**
   * Create a new progress log entry.
   */
  logProgress(
    userId: Types.ObjectId,
    targetType: ProgressTargetType,
    targetId: Types.ObjectId,
    before: number,
    after: number,
    note?: string
  ): Promise<IUserProgressLog>;

  /**
   * Fetch recent progress logs for a given user.
   * @param userId the user whose logs we want
   * @param limit  maximum number of entries (default 100)
   */
  getByUser(userId: Types.ObjectId, limit?: number): Promise<IUserProgressLog[]>;

  /**
   * Fetch logs for a specific target (goal/task/tracker).
   */
  getByTarget(
    targetType: ProgressTargetType,
    targetId: Types.ObjectId,
    limit?: number
  ): Promise<IUserProgressLog[]>;
}

/** Schema definition */
const UserProgressLogSchema = new Schema<
  IUserProgressLog,
  IUserProgressLogModel
>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: {
      type: String,
      enum: ["goal", "task", "tracker"],
      required: true,
      index: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    before: { type: Number, required: true },
    after: { type: Number, required: true },
    note: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** Index to speed up queries by user and target */
UserProgressLogSchema.index({ user: 1, createdAt: -1 });
UserProgressLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

/** Instance method for a quick one-line summary */
UserProgressLogSchema.methods.summary = function (this: IUserProgressLog): string {
  const time = this.createdAt.toISOString();
  return `[${time}] ${this.user} ${this.targetType} ${this.targetId}: ${this.before} → ${this.after}` +
         (this.note ? ` (${this.note})` : "");
};

/** Static: log a new progress entry */
UserProgressLogSchema.statics.logProgress = async function (
  this: IUserProgressLogModel,
  userId: Types.ObjectId,
  targetType: ProgressTargetType,
  targetId: Types.ObjectId,
  before: number,
  after: number,
  note?: string
): Promise<IUserProgressLog> {
  const entry = new this({ user: userId, targetType, targetId, before, after, note });
  return entry.save();
};

/** Static: get recent logs for a user */
UserProgressLogSchema.statics.getByUser = function (
  this: IUserProgressLogModel,
  userId: Types.ObjectId,
  limit = 100
): Promise<IUserProgressLog[]> {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

/** Static: get logs for a specific target */
UserProgressLogSchema.statics.getByTarget = function (
  this: IUserProgressLogModel,
  targetType: ProgressTargetType,
  targetId: Types.ObjectId,
  limit = 100
): Promise<IUserProgressLog[]> {
  return this.find({ targetType, targetId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

/** Export the model */
export const UserProgressLog = mongoose.model<
  IUserProgressLog,
  IUserProgressLogModel
>("UserProgressLog", UserProgressLogSchema);

export default UserProgressLog;
