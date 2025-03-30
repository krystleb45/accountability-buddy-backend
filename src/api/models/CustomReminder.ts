import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define TypeScript interface for the reminder document
interface ICustomReminder extends Document {
  user: Types.ObjectId;
  message: string;
  scheduledTime: Date;
  repeatFrequency: "none" | "daily" | "weekly" | "monthly";
  isActive: boolean;
  lastSent?: Date;
  endRepeat?: Date;
  createdAt: Date;
  updatedAt: Date;
  deactivate: () => Promise<void>;
}

interface ICustomReminderModel extends Model<ICustomReminder> {
  getUpcomingReminders: (start: Date, end: Date) => Promise<ICustomReminder[]>;
  getUserReminders: (
    userId: Types.ObjectId,
    filters?: Partial<ICustomReminder>
  ) => Promise<ICustomReminder[]>;
}

// Define the schema
const CustomReminderSchema: Schema<ICustomReminder> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Optimized for queries on reminders by user
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [255, "Message cannot exceed 255 characters"],
    },
    scheduledTime: {
      type: Date,
      required: [true, "Scheduled time is required"],
      validate: {
        validator: function (value: Date): boolean {
          return value > new Date(); // Ensure scheduled time is in the future
        },
        message: "Scheduled time must be in the future",
      },
    },
    repeatFrequency: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSent: {
      type: Date, // Track when the reminder was last sent
    },
    endRepeat: {
      type: Date,
      validate: {
        validator: function (value: Date): boolean {
          return !value || value > this.scheduledTime; // Ensure endRepeat is after scheduledTime
        },
        message: "End repeat must be after the scheduled time",
      },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  },
);

// Indexes for optimized queries
CustomReminderSchema.index({ user: 1 });
CustomReminderSchema.index({ scheduledTime: 1 });
CustomReminderSchema.index({ isActive: 1 });
CustomReminderSchema.index({ repeatFrequency: 1 });

// Pre-save middleware to check for repeatFrequency and endRepeat consistency
CustomReminderSchema.pre<ICustomReminder>("save", function (next): void {
  if (this.repeatFrequency !== "none" && !this.endRepeat) {
    return next(new Error("End repeat date is required for recurring reminders"));
  }
  next();
});

// Instance method to deactivate a reminder
CustomReminderSchema.methods.deactivate = async function (): Promise<void> {
  this.isActive = false;
  await this.save();
};

// Static method to get active reminders scheduled within a specific timeframe
CustomReminderSchema.statics.getUpcomingReminders = async function (
  start: Date,
  end: Date,
): Promise<ICustomReminder[]> {
  return this.find({
    isActive: true,
    scheduledTime: { $gte: start, $lte: end },
  });
};

// Static method to get reminders by user with optional filters
CustomReminderSchema.statics.getUserReminders = async function (
  userId: Types.ObjectId,
  filters: Partial<ICustomReminder> = {},
): Promise<ICustomReminder[]> {
  const query = {
    user: userId,
    ...(filters as mongoose.FilterQuery<ICustomReminder>),
  };

  return this.find(query);
};

// Export the CustomReminder model
const CustomReminder: ICustomReminderModel = mongoose.model<ICustomReminder, ICustomReminderModel>(
  "CustomReminder",
  CustomReminderSchema,
);

export default CustomReminder;
