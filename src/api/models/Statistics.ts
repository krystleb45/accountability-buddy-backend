import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStatistics extends Document {
  user: Types.ObjectId;
  goalsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  weeklyActivity: {
    [day: string]: number; // e.g., { "Monday": 2, "Tuesday": 0, ... }
  };
  lastUpdated: Date;
}

const StatisticsSchema: Schema = new Schema<IStatistics>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // One stats document per user
  },
  goalsCompleted: {
    type: Number,
    default: 0,
  },
  currentStreak: {
    type: Number,
    default: 0,
  },
  longestStreak: {
    type: Number,
    default: 0,
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  weeklyActivity: {
    type: Map,
    of: Number,
    default: () => ({
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    }),
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IStatistics>("Statistics", StatisticsSchema);
