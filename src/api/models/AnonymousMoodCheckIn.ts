// src/api/models/AnonymousMoodCheckIn.ts

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnonymousMoodCheckIn extends Document {
  sessionId: string;
  mood: number; // 1-5 scale
  note?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for aggregated mood data
export interface IAggregatedMoodData {
  date: string;
  averageMood: number;
  totalCheckIns: number;
  moodDistribution: {
    mood1: number;
    mood2: number;
    mood3: number;
    mood4: number;
    mood5: number;
  };
}

// Interface for the model with static methods
export interface IAnonymousMoodCheckInModel extends Model<IAnonymousMoodCheckIn> {
  getTodaysMoodDistribution(): Promise<IAggregatedMoodData>;
  getMoodTrends(days: number): Promise<IAggregatedMoodData[]>;
  hasSubmittedToday(sessionId: string): Promise<boolean>;
}

const AnonymousMoodCheckInSchema = new Schema<IAnonymousMoodCheckIn>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
      trim: true,
      maxlength: 100
    },
    mood: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: function(v: number): boolean {
          return Number.isInteger(v) && v >= 1 && v <= 5;
        },
        message: "Mood must be an integer between 1 and 5"
      }
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 45, // IPv6 max length
      default: null
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null
    }
  },
  {
    timestamps: true,
    collection: "anonymous_mood_checkins"
  }
);

// Indexes for efficient queries
AnonymousMoodCheckInSchema.index({ sessionId: 1, createdAt: -1 });
AnonymousMoodCheckInSchema.index({ createdAt: -1 });
AnonymousMoodCheckInSchema.index({ mood: 1 });

// Compound index for daily check validation
AnonymousMoodCheckInSchema.index({
  sessionId: 1,
  createdAt: -1
}, {
  partialFilterExpression: {
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  }
});

// Static method to get today's mood distribution
AnonymousMoodCheckInSchema.statics.getTodaysMoodDistribution = async function(): Promise<IAggregatedMoodData> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      }
    },
    {
      $group: {
        _id: null,
        averageMood: { $avg: "$mood" },
        totalCheckIns: { $sum: 1 },
        mood1: { $sum: { $cond: [{ $eq: ["$mood", 1] }, 1, 0] } },
        mood2: { $sum: { $cond: [{ $eq: ["$mood", 2] }, 1, 0] } },
        mood3: { $sum: { $cond: [{ $eq: ["$mood", 3] }, 1, 0] } },
        mood4: { $sum: { $cond: [{ $eq: ["$mood", 4] }, 1, 0] } },
        mood5: { $sum: { $cond: [{ $eq: ["$mood", 5] }, 1, 0] } }
      }
    }
  ] as any[];

  const result = await this.aggregate(pipeline);

  if (result.length === 0) {
    return {
      date: today.toISOString().split("T")[0],
      averageMood: 3, // Default neutral mood
      totalCheckIns: 0,
      moodDistribution: {
        mood1: 0,
        mood2: 0,
        mood3: 0,
        mood4: 0,
        mood5: 0
      }
    };
  }

  const data = result[0];
  return {
    date: today.toISOString().split("T")[0],
    averageMood: Math.round(data.averageMood * 10) / 10, // Round to 1 decimal
    totalCheckIns: data.totalCheckIns,
    moodDistribution: {
      mood1: data.mood1,
      mood2: data.mood2,
      mood3: data.mood3,
      mood4: data.mood4,
      mood5: data.mood5
    }
  };
};

// Static method to get mood trends over time
AnonymousMoodCheckInSchema.statics.getMoodTrends = async function(days: number = 7): Promise<IAggregatedMoodData[]> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" }
        },
        averageMood: { $avg: "$mood" },
        totalCheckIns: { $sum: 1 },
        mood1: { $sum: { $cond: [{ $eq: ["$mood", 1] }, 1, 0] } },
        mood2: { $sum: { $cond: [{ $eq: ["$mood", 2] }, 1, 0] } },
        mood3: { $sum: { $cond: [{ $eq: ["$mood", 3] }, 1, 0] } },
        mood4: { $sum: { $cond: [{ $eq: ["$mood", 4] }, 1, 0] } },
        mood5: { $sum: { $cond: [{ $eq: ["$mood", 5] }, 1, 0] } }
      }
    },
    {
      $sort: { "_id.year": 1 as 1, "_id.month": 1 as 1, "_id.day": 1 as 1 }
    }
  ] as any[];

  const results = await this.aggregate(pipeline);

  return results.map((item: any) => ({
    date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`,
    averageMood: Math.round(item.averageMood * 10) / 10,
    totalCheckIns: item.totalCheckIns,
    moodDistribution: {
      mood1: item.mood1,
      mood2: item.mood2,
      mood3: item.mood3,
      mood4: item.mood4,
      mood5: item.mood5
    }
  }));
};

// Static method to check if session has submitted today
AnonymousMoodCheckInSchema.statics.hasSubmittedToday = async function(sessionId: string): Promise<boolean> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const count = await this.countDocuments({
    sessionId,
    createdAt: {
      $gte: startOfDay,
      $lt: endOfDay
    }
  });

  return count > 0;
};

// Pre-save middleware to clean up data
AnonymousMoodCheckInSchema.pre("save", function(next): void {
  // Clean up note field
  if (this.note) {
    this.note = this.note.trim();
    if (this.note.length === 0) {
      this.note = undefined;
    }
  }

  next();
});

// Export the model
const AnonymousMoodCheckIn: IAnonymousMoodCheckInModel = mongoose.model<IAnonymousMoodCheckIn, IAnonymousMoodCheckInModel>(
  "AnonymousMoodCheckIn",
  AnonymousMoodCheckInSchema
);

export default AnonymousMoodCheckIn;
