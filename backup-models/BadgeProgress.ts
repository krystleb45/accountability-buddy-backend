// src/api/models/BadgeProgress.ts
import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import { logger } from "../../utils/winstonLogger";

/**
 * The badge‐progress document interface.
 */
export interface IBadgeProgress extends Document {
  user: Types.ObjectId;
  badgeType: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The model interface, if you need any statics in future.
 */
export interface IBadgeProgressModel extends Model<IBadgeProgress> {
  // e.g. you could add:
  // resetProgressForUser(userId: Types.ObjectId): Promise<void>;
}

const BadgeProgressSchema = new Schema<IBadgeProgress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    badgeType: {
      type: String,
      required: true,
      trim: true,
    },
    progress: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Progress cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// single compound index instead of field-level ones
BadgeProgressSchema.index({ user: 1, badgeType: 1 });

// Example hook: log each save
BadgeProgressSchema.post<IBadgeProgress>("save", function (doc) {
  logger.info(
    `BadgeProgress for user ${doc.user.toString()} and badgeType "${doc.badgeType}" is now ${doc.progress}`
  );
});

// (Optional) Example static for future extensions
// BadgeProgressSchema.statics.resetProgressForUser = async function (userId: Types.ObjectId) {
//   await this.updateMany({ user: userId }, { $set: { progress: 0 } });
// };

export const BadgeProgress = mongoose.model<IBadgeProgress, IBadgeProgressModel>(
  "BadgeProgress",
  BadgeProgressSchema
);

export default BadgeProgress;
