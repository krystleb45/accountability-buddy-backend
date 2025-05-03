// src/api/models/CustomReminder.ts

import type { Document, Model, CallbackError } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface ICustomReminder extends Document {
  user: mongoose.Types.ObjectId;
  reminderMessage: string;
  remindAt: Date;
  recurrence?: string | null;
  disabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomReminderModel extends Model<ICustomReminder> {}

/** CustomReminder schema definition */
const CustomReminderSchema = new Schema<ICustomReminder, ICustomReminderModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reminderMessage: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    remindAt: {
      type: Date,
      required: true,
    },
    recurrence: {
      type: String,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
  }
);

// — Index declarations (only here) —
CustomReminderSchema.index({ user: 1 });
CustomReminderSchema.index({ remindAt: 1 });
CustomReminderSchema.index({ disabled: 1 });

/** Ensure `remindAt` is always in the future */
CustomReminderSchema.pre<ICustomReminder>(
  "save",
  function (this: ICustomReminder, next: (err?: CallbackError) => void): void {
    if (this.remindAt <= new Date()) {
      return next(new Error("remindAt must be in the future"));
    }
    next();
  }
);

export const CustomReminder = mongoose.model<ICustomReminder, ICustomReminderModel>(
  "CustomReminder",
  CustomReminderSchema
);

export default CustomReminder;
