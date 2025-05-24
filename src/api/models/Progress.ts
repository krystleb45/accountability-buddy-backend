// File: src/models/Progress.ts

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProgress extends Document {
  user: mongoose.Types.ObjectId;
  goal: mongoose.Types.ObjectId;
  progress: number;        // e.g. 0–100
  updatedAt: Date;
}

const ProgressSchema = new Schema<IProgress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    goal: {
      type: Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
      index: true,
    },
    progress: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// ensure one progress-per-user-per-goal
ProgressSchema.index({ user: 1, goal: 1 }, { unique: true });

const Progress: Model<IProgress> =
  mongoose.models.Progress ||
  mongoose.model<IProgress>("Progress", ProgressSchema);

export default Progress;
