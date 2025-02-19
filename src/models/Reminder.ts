import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the Reminder interface
export interface IReminder extends Document {
  user: Types.ObjectId;
  message: string;
  goal: Types.ObjectId;
  remindAt: Date;
  isSent: boolean;
  reminderType: "email" | "sms" | "app";
  recurrence: "none" | "daily" | "weekly" | "monthly";
  email?: string; // Optional email field
  createdAt: Date;
  updatedAt: Date;
  isRecurring: boolean; // Virtual field
}

// Extend the model interface for static methods
interface IReminderModel extends Model<IReminder> {
  getUpcomingReminders(userId: Types.ObjectId): Promise<IReminder[]>;
  markAsSent(reminderId: string): Promise<IReminder | null>;
}

// Define the Reminder schema
const ReminderSchema = new Schema<IReminder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: [true, "Reminder message is required"],
      trim: true,
      maxlength: [255, "Message cannot exceed 255 characters"],
    },
    goal: {
      type: Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
      index: true,
    },
    remindAt: {
      type: Date,
      required: [true, "Reminder date and time are required"],
      validate: {
        validator: function (value: Date): boolean {
          return value.getTime() > Date.now();
        },
        message: "Reminder time must be in the future",
      },
      index: true,
    },
    isSent: {
      type: Boolean,
      default: false,
    },
    reminderType: {
      type: String,
      enum: ["email", "sms", "app"],
      default: "app",
    },
    recurrence: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
    email: {
      type: String,
      trim: true,
      validate: {
        validator: function (email: string): boolean {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // Basic email validation
        },
        message: "Invalid email address",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Index to ensure reminders are fetched by user and reminder time
ReminderSchema.index({ user: 1, remindAt: 1 });

// Pre-save hook to validate and sanitize inputs
ReminderSchema.pre("save", function (next) {
  if (this.isModified("message")) {
    this.message = this.message.trim();
  }
  if (this.isModified("remindAt") && this.remindAt.getTime() <= Date.now()) {
    return next(new Error("Reminder time must be in the future"));
  }
  next();
});

// Static method to get upcoming reminders for a user
ReminderSchema.statics.getUpcomingReminders = async function (
  userId: Types.ObjectId,
): Promise<IReminder[]> {
  return await this.find({
    user: userId,
    remindAt: { $gte: new Date() },
    isSent: false,
  }).sort({ remindAt: 1 });
};

// Static method to mark a reminder as sent
ReminderSchema.statics.markAsSent = async function (
  reminderId: string,
): Promise<IReminder | null> {
  const reminder = await this.findById(reminderId);
  if (reminder) {
    reminder.isSent = true;
    await reminder.save();
  }
  return reminder;
};

// Virtual field to check if a reminder is recurring
ReminderSchema.virtual("isRecurring").get(function (): boolean {
  return this.recurrence !== "none";
});

// Export the Reminder model
export const Reminder: IReminderModel = mongoose.model<IReminder, IReminderModel>(
  "Reminder",
  ReminderSchema,
);
