import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Streak Document Interface ---
export interface IStreak extends Document {
  user: Types.ObjectId;
  streakCount: number;
  lastCheckIn: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  recordCheckIn(): Promise<IStreak>;
  resetStreak(): Promise<IStreak>;
}

// --- Streak Model Static Interface ---
export interface IStreakModel extends Model<IStreak> {
  getByUser(userId: Types.ObjectId): Promise<IStreak | null>;
  resetUserStreak(userId: Types.ObjectId): Promise<void>;
}

// --- Schema Definition ---
const StreakSchema = new Schema<IStreak, IStreakModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    streakCount: {
      type: Number,
      default: 0,
      min: [0, "Streak count cannot be negative"],
    },
    lastCheckIn: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// --- Instance Methods ---
// Record a check-in: increments or resets streak based on last check-in
StreakSchema.methods.recordCheckIn = async function (this: IStreak): Promise<IStreak> {
  const now = new Date();
  const last = this.lastCheckIn;
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (last && now.getTime() - last.getTime() <= oneDayMs * 1.5) {
    this.streakCount += 1;
  } else {
    this.streakCount = 1;
  }
  this.lastCheckIn = now;
  return this.save();
};

// Reset the streak to zero
StreakSchema.methods.resetStreak = async function (this: IStreak): Promise<IStreak> {
  this.streakCount = 0;
  this.lastCheckIn = null;
  return this.save();
};

// --- Static Methods ---
// Find streak by user
StreakSchema.statics.getByUser = function (
  this: IStreakModel,
  userId: Types.ObjectId
): Promise<IStreak | null> {
  return this.findOne({ user: userId }).exec();
};

// Reset a user's streak
StreakSchema.statics.resetUserStreak = async function (
  this: IStreakModel,
  userId: Types.ObjectId
): Promise<void> {
  const streak = await this.findOne({ user: userId }).exec();
  if (streak) {
    streak.streakCount = 0;
    streak.lastCheckIn = null;
    await streak.save();
  }
};

// --- Model Export ---
export const Streak = mongoose.model<IStreak, IStreakModel>("Streak", StreakSchema);

export default Streak;
