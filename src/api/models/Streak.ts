import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Streak Interface
export interface IStreak extends Document {
  user: mongoose.Types.ObjectId;
  streakCount: number;
  lastCheckIn: Date | null; // Allow null for lastCheckIn
}

// Define Streak Schema
const StreakSchema = new Schema<IStreak>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Ensure one streak per user
    },
    streakCount: {
      type: Number,
      default: 0, // Start with 0 streaks
      min: 0, // Cannot be negative
    },
    lastCheckIn: {
      type: Date,
      default: null, // Allow null value for lastCheckIn
    },
  },
  {
    timestamps: true, // Automatically adds createdAt & updatedAt fields
  }
);

// Streak Model Interface (with Static Methods)
export interface StreakModel extends Model<IStreak> {
  resetUserStreak(userId: string): Promise<void>;
}

// Define and export the Streak model
StreakSchema.statics.resetUserStreak = async function (userId: string): Promise<void> {
  const streak = await this.findOne({ user: userId });

  if (streak) {
    streak.streakCount = 0;
    streak.lastCheckIn = null; // Now allowed
    await streak.save();
  }
};

const Streak = mongoose.model<IStreak, StreakModel>("Streak", StreakSchema);
export default Streak;
