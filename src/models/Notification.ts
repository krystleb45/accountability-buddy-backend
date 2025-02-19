import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Interface for Notification
export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  message: string;
  type: "info" | "warning" | "alert" | "success";
  read: boolean;
  link?: string;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  isExpired: boolean; // Virtual field
}

// Notification Schema
const NotificationSchema: Schema<INotification> = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "warning", "alert", "success"],
      default: "info",
    },
    read: { type: Boolean, default: false },
    link: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

// Virtual field for expiration status
NotificationSchema.virtual("isExpired").get(function (this: INotification) {
  return this.expiresAt ? new Date() > new Date(this.expiresAt) : false;
});

// Export the Notification model and type
const Notification: Model<INotification> = mongoose.model<INotification>(
  "Notification",
  NotificationSchema,
);

export default Notification;
export type NotificationDocument = INotification;
