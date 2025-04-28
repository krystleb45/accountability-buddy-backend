import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Document Interface ---
export interface IUserActivity extends Document {
  user: Types.ObjectId;            // Who performed the activity
  activityType: string;            // e.g. "login", "update_profile"
  details: string;                 // Additional context
  createdAt: Date;                 // When it happened

  // Instance methods
  summary(): string;
}

// --- Model Interface ---
export interface IUserActivityModel extends Model<IUserActivity> {
  /**
   * Log a new activity for a user.
   */
  logActivity(
    userId: Types.ObjectId,
    activityType: string,
    details: string
  ): Promise<IUserActivity>;

  /**
   * Fetch recent activities for a specific user.
   * @param userId  the user's _id
   * @param limit   max number of records to return (default: 50)
   */
  getActivitiesForUser(
    userId: Types.ObjectId,
    limit?: number
  ): Promise<IUserActivity[]>;

  /**
   * Fetch the most recent activities across all users.
   * @param limit   max number of records to return (default: 100)
   */
  getRecent(limit?: number): Promise<IUserActivity[]>;
}

// --- Schema Definition ---
const UserActivitySchema = new Schema<IUserActivity, IUserActivityModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    details: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
UserActivitySchema.index({ user: 1, createdAt: -1 });
UserActivitySchema.index({ activityType: 1, createdAt: -1 });

// --- Instance Methods ---
UserActivitySchema.methods.summary = function (this: IUserActivity): string {
  const time = this.createdAt.toISOString();
  return `[${time}] (${this.activityType}) ${this.details}`;
};

// --- Static Methods ---
UserActivitySchema.statics.logActivity = async function (
  this: IUserActivityModel,
  userId: Types.ObjectId,
  activityType: string,
  details: string
): Promise<IUserActivity> {
  const activity = new this({ user: userId, activityType, details });
  return activity.save();
};

UserActivitySchema.statics.getActivitiesForUser = function (
  this: IUserActivityModel,
  userId: Types.ObjectId,
  limit = 50
): Promise<IUserActivity[]> {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

UserActivitySchema.statics.getRecent = function (
  this: IUserActivityModel,
  limit = 100
): Promise<IUserActivity[]> {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

// --- Model Export ---
export const UserActivity: IUserActivityModel = mongoose.model<
  IUserActivity,
  IUserActivityModel
>("UserActivity", UserActivitySchema);

export default UserActivity;
