import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Tracker Document Interface ---
export interface ITracker extends Document {
  user: Types.ObjectId;   // Reference to the User model
  name: string;           // Name of the tracker
  progress: number;       // Progress percentage (0-100)
  createdAt: Date;        // Timestamp for creation
  updatedAt: Date;        // Timestamp for last update

  // Instance methods
  addProgress(amount: number): Promise<ITracker>;
  reset(): Promise<ITracker>;
  isComplete(): boolean;
}

// --- Tracker Model Interface ---
export interface ITrackerModel extends Model<ITracker> {
  findByUser(userId: Types.ObjectId): Promise<ITracker[]>;
  resetAll(userId: Types.ObjectId): Promise<void>;
}

// --- Tracker Schema Definition ---
const TrackerSchema = new Schema<ITracker, ITrackerModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Tracker name is required"],
      trim: true,
      maxlength: [100, "Tracker name cannot exceed 100 characters"],
    },
    progress: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Progress cannot be less than 0"],
      max: [100, "Progress cannot exceed 100"],
    },
  },
  {
    timestamps: true,
  }
);

// --- Instance Methods ---
TrackerSchema.methods.addProgress = async function (
  this: ITracker,
  amount: number
): Promise<ITracker> {
  this.progress = Math.min(100, this.progress + amount);
  return this.save();
};

TrackerSchema.methods.reset = async function (
  this: ITracker
): Promise<ITracker> {
  this.progress = 0;
  return this.save();
};

TrackerSchema.methods.isComplete = function (
  this: ITracker
): boolean {
  return this.progress >= 100;
};

// --- Static Methods ---
TrackerSchema.statics.findByUser = function (
  this: ITrackerModel,
  userId: Types.ObjectId
): Promise<ITracker[]> {
  return this.find({ user: userId }).sort({ name: 1 }).exec();
};

TrackerSchema.statics.resetAll = async function (
  this: ITrackerModel,
  userId: Types.ObjectId
): Promise<void> {
  await this.updateMany({ user: userId }, { progress: 0 }).exec();
};

// --- Explicit Indexes ---
TrackerSchema.index({ user: 1, name: 1 });

// --- Model Export ---
export const Tracker = mongoose.model<ITracker, ITrackerModel>(
  "Tracker",
  TrackerSchema
);

export default Tracker;
