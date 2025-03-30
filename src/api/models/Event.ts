import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";
import { CustomError } from "../services/errorHandler"; // Import CustomError for consistency

// Define Participant interface
interface IParticipant {
  user: Types.ObjectId;
  joinedAt?: Date;
  status?: "invited" | "accepted" | "declined" | "interested";
}

// Define Reminder interface
interface IReminder {
  message: string;
  scheduledTime: Date;
  sent?: boolean;
}

// Define Event interface
export interface IEvent extends Document {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  createdBy: Types.ObjectId;
  participants: IParticipant[];
  progress: number; // <-- Added progress field
  recurrence?: "none" | "daily" | "weekly" | "monthly" | "yearly";
  status: "upcoming" | "ongoing" | "completed" | "canceled";
  isPublic: boolean;
  reminders: IReminder[];
  participantCount?: number; // Virtual field
  addReminder: (message: string, scheduledTime: Date) => Promise<void>;
  getActiveReminders: () => IReminder[];
}

interface IEventModel extends Model<IEvent> {
  addParticipant: (
    eventId: string,
    userId: Types.ObjectId,
    status?: "invited" | "accepted" | "declined" | "interested"
  ) => Promise<IEvent>;
  removeParticipant: (eventId: string, userId: Types.ObjectId) => Promise<IEvent>;
}

// Define Event schema
const EventSchema: Schema<IEvent> = new Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [255, "Location cannot exceed 255 characters"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      validate: {
        validator: function (value: Date): boolean {
          return value > new Date();
        },
        message: "Start date must be in the future",
      },
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (value: Date): boolean {
          return value > this.startDate;
        },
        message: "End date must be after the start date",
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        joinedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["invited", "accepted", "declined", "interested"],
          default: "invited",
        },
      },
    ],
    recurrence: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly", "yearly"],
      default: "none",
    },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "canceled"],
      default: "upcoming",
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    reminders: [
      {
        message: { type: String, trim: true, maxlength: 255 },
        scheduledTime: { type: Date },
        sent: { type: Boolean, default: false },
      },
    ],
    progress: {
      type: Number,
      default: 0, // <-- Added progress field with default 0
      min: [0, "Progress cannot be less than 0"],
      max: [100, "Progress cannot be more than 100"],
    },
  },
  { timestamps: true },
);

// Indexes for optimized queries
EventSchema.index({ createdBy: 1 });
EventSchema.index({ startDate: 1 });
EventSchema.index({ status: 1 });

// Pre-save middleware to adjust event status
EventSchema.pre("save", function (next) {
  if (this.endDate < new Date() && this.status === "upcoming") {
    this.status = "completed";
  }
  next();
});

// Static method to add participants
EventSchema.statics.addParticipant = async function (
  eventId: string,
  userId: Types.ObjectId,
  status: "invited" | "accepted" | "declined" | "interested" = "invited",
): Promise<IEvent> {
  const event = await this.findById(eventId);
  if (!event) throw new CustomError("Event not found", 404);

  const isParticipant = event.participants.some((p: IParticipant) =>
    p.user.toString() === userId.toString(),
  );
  if (isParticipant) throw new CustomError("User is already a participant", 400);

  event.participants.push({ user: userId, status });
  await event.save();
  return event;
};

// Static method to remove participants
EventSchema.statics.removeParticipant = async function (
  eventId: string,
  userId: Types.ObjectId,
): Promise<IEvent> {
  const event = await this.findById(eventId);
  if (!event) throw new CustomError("Event not found", 404);

  event.participants = event.participants.filter(
    (p: IParticipant) => p.user.toString() !== userId.toString(),
  );
  await event.save();
  return event;
};

// Instance method to add a reminder
EventSchema.methods.addReminder = async function (
  message: string,
  scheduledTime: Date,
): Promise<void> {
  if (!message || !scheduledTime)
    throw new CustomError("Message and scheduled time are required", 400);
  this.reminders.push({ message, scheduledTime });
  await this.save();
};

// Instance method to get active reminders
EventSchema.methods.getActiveReminders = function (): IReminder[] {
  return this.reminders.filter(
    (reminder: IReminder) =>
      !reminder.sent && reminder.scheduledTime > new Date(),
  );
};

// Virtual field to calculate total participants
EventSchema.virtual("participantCount").get(function () {
  return this.participants.length;
});

// Export Event model
const Event = mongoose.model<IEvent, IEventModel>("Event", EventSchema);
export default Event;
