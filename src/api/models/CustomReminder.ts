// src/api/models/CustomReminder.ts

import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICustomReminder extends Document {
  user: mongoose.Types.ObjectId;
  reminderMessage: string;
  remindAt: Date;
  recurrence?: string;
  disabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomReminderModel extends Model<ICustomReminder> {}

const CustomReminderSchema = new Schema<ICustomReminder, ICustomReminderModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
      index: true,
    },
    recurrence: {
      type: String,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
  }
);

// optional: ensure remindAt is in the future
CustomReminderSchema.pre<ICustomReminder>("save", function (next) {
  if (this.remindAt <= new Date()) {
    return next(new Error("remindAt must be in the future"));
  }
  next();
});

export const CustomReminder = mongoose.model<ICustomReminder, ICustomReminderModel>(
  "CustomReminder",
  CustomReminderSchema
);

export default CustomReminder;
