// src/api/models/Event.ts

import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Types & Interfaces ---
export type ParticipantStatus = "invited" | "accepted" | "declined" | "interested";

export interface IEventParticipant {
  user: Types.ObjectId;
  joinedAt: Date;
  status: ParticipantStatus;
}

export interface IEventReminder {
  message: string;
  scheduledTime: Date;
  sent: boolean;
}

export interface IEvent extends Document {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  createdBy: Types.ObjectId;
  participants: Types.DocumentArray<IEventParticipant>;
  progress: number;
  recurrence: "none" | "daily" | "weekly" | "monthly" | "yearly";
  status: "upcoming" | "ongoing" | "completed" | "canceled";
  isPublic: boolean;
  reminders: Types.DocumentArray<IEventReminder>;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  participantCount: number;
  activeReminderCount: number;

  // Instance methods
  addReminder(message: string, scheduledTime: Date): Promise<IEvent>;
  getActiveReminders(): IEventReminder[];
}

export interface IEventModel extends Model<IEvent> {
  addParticipant(
    eventId: Types.ObjectId,
    userId: Types.ObjectId,
    status?: ParticipantStatus
  ): Promise<IEvent>;
  removeParticipant(
    eventId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<IEvent>;
}

// --- Sub‑Schemas ---
const ParticipantSchema = new Schema<IEventParticipant>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["invited", "accepted", "declined", "interested"],
      default: "invited",
    },
  },
  { _id: false }
);

const ReminderSchema = new Schema<IEventReminder>(
  {
    message: { type: String, required: true, trim: true, maxlength: 255 },
    scheduledTime: { type: Date, required: true },
    sent: { type: Boolean, default: false },
  },
  { _id: false }
);

// --- Main Schema ---
const EventSchema = new Schema<IEvent, IEventModel>(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    location: { type: String, trim: true, maxlength: 255 },
    startDate: {
      type: Date,
      required: true,
      validate: {
        validator: (value: Date): boolean => value.getTime() > Date.now(),
        message: "Start date must be in the future",
      },
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(this: IEvent, value: Date): boolean {
          return value.getTime() > this.startDate.getTime();
        },
        message: "End date must be after start date",
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    participants: { type: [ParticipantSchema], default: [] },
    progress: { type: Number, default: 0, min: 0, max: 100 },
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
    isPublic: { type: Boolean, default: true },
    reminders: { type: [ReminderSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Compound Indexes (one place for all) ---
EventSchema.index({ title: 1 });
EventSchema.index({ startDate: 1, endDate: 1 });
EventSchema.index({ createdBy: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ isPublic: 1 });

// --- Pre‑save Hook ---
EventSchema.pre<IEvent>("save", function (next): void {
  if (this.endDate.getTime() < Date.now() && this.status === "upcoming") {
    this.status = "completed";
  }
  next();
});

// --- Instance Methods ---
EventSchema.methods.addReminder = async function (
  this: IEvent,
  message: string,
  scheduledTime: Date
): Promise<IEvent> {
  if (!message || !scheduledTime) {
    throw new Error("Message and scheduledTime are required");
  }
  this.reminders.push({ message, scheduledTime, sent: false });
  await this.save();
  return this;
};

EventSchema.methods.getActiveReminders = function (this: IEvent): IEventReminder[] {
  return this.reminders.filter(
    (r) => !r.sent && r.scheduledTime.getTime() > Date.now()
  );
};

// --- Static Methods ---
EventSchema.statics.addParticipant = async function (
  eventId: Types.ObjectId,
  userId: Types.ObjectId,
  status: ParticipantStatus = "invited"
): Promise<IEvent> {
  const event = await this.findById(eventId);
  if (!event) throw new Error("Event not found");
  if (event.participants.some((p) => p.user.equals(userId))) {
    throw new Error("User already a participant");
  }
  event.participants.push({ user: userId, joinedAt: new Date(), status });
  await event.save();
  return event;
};

EventSchema.statics.removeParticipant = async function (
  eventId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<IEvent> {
  const event = await this.findById(eventId);
  if (!event) throw new Error("Event not found");
  event.participants = event.participants.filter(
    (p) => !p.user.equals(userId)
  ) as mongoose.Types.DocumentArray<IEventParticipant>;
  await event.save();
  return event;
};

// --- Virtuals ---
EventSchema.virtual("participantCount").get(function (this: IEvent): number {
  return this.participants.length;
});

EventSchema.virtual("activeReminderCount").get(function (this: IEvent): number {
  return this.reminders.filter(
    (r) => !r.sent && r.scheduledTime.getTime() > Date.now()
  ).length;
});

// --- Model Export ---
export const Event = mongoose.model<IEvent, IEventModel>("Event", EventSchema);
export default Event;
