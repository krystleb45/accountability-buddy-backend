import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Document Interface ---
export interface IXpHistory extends Document {
  userId: Types.ObjectId;   // Reference to User
  xp: number;               // XP gained
  date: Date;               // When XP was earned
  reason: string;           // E.g. "Completed Goal"

  createdAt: Date;          // Auto-added by timestamps
  updatedAt: Date;          // Auto-added by timestamps

  /** Human-readable summary */
  summary(): string;
}

// --- Model Interface ---
export interface IXpHistoryModel extends Model<IXpHistory> {
  /**
   * Log a new XP entry.
   */
  logXp(
    userId: Types.ObjectId,
    xp: number,
    reason: string,
    date?: Date
  ): Promise<IXpHistory>;

  /**
   * Fetch recent XP entries for a user.
   */
  getForUser(
    userId: Types.ObjectId,
    limit?: number
  ): Promise<IXpHistory[]>;

  /**
   * Compute total XP for a user.
   */
  getTotalXp(userId: Types.ObjectId): Promise<number>;
}

// --- Schema Definition ---
const XpHistorySchema = new Schema<IXpHistory, IXpHistoryModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    xp: {
      type: Number,
      required: true,
      min: [0, "XP must be non-negative"],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: [255, "Reason cannot exceed 255 characters"],
    },
  },
  {
    timestamps: true,         // Adds createdAt & updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
XpHistorySchema.index({ userId: 1, date: -1 });

// --- Instance Methods ---
XpHistorySchema.methods.summary = function (this: IXpHistory): string {
  const d = this.date.toISOString().split("T")[0];
  return `${d}: +${this.xp} XP (${this.reason})`;
};

// --- Static Methods ---
XpHistorySchema.statics.logXp = async function (
  this: IXpHistoryModel,
  userId: Types.ObjectId,
  xp: number,
  reason: string,
  date: Date = new Date()
): Promise<IXpHistory> {
  const entry = new this({ userId, xp, reason, date });
  return entry.save();
};

XpHistorySchema.statics.getForUser = function (
  this: IXpHistoryModel,
  userId: Types.ObjectId,
  limit = 50
): Promise<IXpHistory[]> {
  return this.find({ userId })
    .sort({ date: -1 })
    .limit(limit)
    .exec();
};

XpHistorySchema.statics.getTotalXp = async function (
  this: IXpHistoryModel,
  userId: Types.ObjectId
): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: "$xp" } } }
  ]);
  return result.length > 0 ? result[0].total : 0;
};

// --- Model Export ---
export const XpHistory = mongoose.model<IXpHistory, IXpHistoryModel>(
  "XpHistory",
  XpHistorySchema
);

export default XpHistory;
