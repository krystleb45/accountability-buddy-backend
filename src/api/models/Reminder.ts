import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Recurrence and ReminderType ---
type Recurrence = "none" | "daily" | "weekly" | "monthly";
type ReminderType = "email" | "sms" | "app";

// --- Reminder Document Interface ---
export interface IReminder extends Document {
  user: Types.ObjectId;
  message: string;
  goal?: Types.ObjectId;
  remindAt: Date;
  recurrence: Recurrence;
  isActive: boolean;
  isSent: boolean;
  reminderType: ReminderType;
  email?: string;
  lastSent?: Date;
  endRepeat?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isRecurring: boolean;

  // Instance methods
  deactivate(): Promise<IReminder>;
  markAsSent(): Promise<IReminder>;
}

// --- Reminder Model Static Interface ---
export interface IReminderModel extends Model<IReminder> {
  getUpcomingRemindersForUser(userId: Types.ObjectId): Promise<IReminder[]>;
  getUpcomingRemindersInRange(start: Date, end: Date): Promise<IReminder[]>;
  getUserReminders(
    userId: Types.ObjectId,
    filters?: Partial<IReminder>
  ): Promise<IReminder[]>;
  markAsSent(reminderId: string): Promise<IReminder | null>;
}

// --- Schema Definition ---
const ReminderSchema = new Schema<IReminder, IReminderModel, IReminder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 255 },
    goal: { type: Schema.Types.ObjectId, ref: "Goal", index: true },
    remindAt: {
      type: Date,
      required: true,
      validate: {
        validator: (value: Date): boolean => value.getTime() > Date.now(),
        message: "Reminder time must be in the future",
      },
      index: true,
    },
    recurrence: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    isSent: { type: Boolean, default: false, index: true },
    reminderType: {
      type: String,
      enum: ["email", "sms", "app"],
      default: "app",
    },
    email: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string): boolean => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Invalid email address",
      },
    },
    lastSent: { type: Date },
    endRepeat: {
      type: Date,
      validate: {
        validator: function (this: IReminder, value: Date): boolean {
          // ensure endRepeat after remindAt
          return !value || value.getTime() > this.remindAt.getTime();
        },
        message: "End repeat must be after remindAt",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Index ---
ReminderSchema.index({ user: 1, remindAt: 1 });

// --- Virtual ---
ReminderSchema.virtual("isRecurring").get(function (this: IReminder): boolean {
  return this.recurrence !== "none";
});

// --- Middleware ---
ReminderSchema.pre<IReminder>("save", function (next): void {
  if (this.isModified("message")) {
    this.message = this.message.trim();
  }
  if (this.recurrence !== "none" && !this.endRepeat) {
    return next(new Error("End repeat date is required for recurring reminders"));
  }
  next();
});

// --- Instance Methods ---
ReminderSchema.methods.deactivate = async function (this: IReminder): Promise<IReminder> {
  this.isActive = false;
  return this.save();
};

ReminderSchema.methods.markAsSent = async function (this: IReminder): Promise<IReminder> {
  this.isSent = true;
  this.lastSent = new Date();
  return this.save();
};

// --- Static Methods ---
ReminderSchema.statics.getUpcomingRemindersForUser = function (
  this: IReminderModel,
  userId: Types.ObjectId
): Promise<IReminder[]> {
  return this.find({
    user: userId,
    remindAt: { $gte: new Date() },
    isSent: false,
    isActive: true,
  })
    .sort({ remindAt: 1 })
    .exec();
};

ReminderSchema.statics.getUpcomingRemindersInRange = function (
  this: IReminderModel,
  start: Date,
  end: Date
): Promise<IReminder[]> {
  return this.find({ isActive: true, remindAt: { $gte: start, $lte: end }, isSent: false }).exec();
};

ReminderSchema.statics.getUserReminders = function (
  this: IReminderModel,
  userId: Types.ObjectId,
  filters: Partial<IReminder> = {}
): Promise<IReminder[]> {
  return this.find({ user: userId, ...filters as any }).exec();
};

ReminderSchema.statics.markAsSent = async function (
  this: IReminderModel,
  reminderId: string
): Promise<IReminder | null> {
  const rem = await this.findById(reminderId).exec();
  if (!rem) return null;
  rem.isSent = true;
  rem.lastSent = new Date();
  return rem.save();
};

// --- Model Export ---
export const Reminder = mongoose.model<IReminder, IReminderModel>("Reminder", ReminderSchema);

export default Reminder;
