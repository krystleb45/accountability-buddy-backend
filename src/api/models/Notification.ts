import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Interface for Notification
export interface INotification extends Document {
  user: mongoose.Types.ObjectId; // The receiver of the notification
  sender?: mongoose.Types.ObjectId; // The sender (if applicable, e.g., friend request)
  message: string;
  type: "friend_request" | "message" | "group_invite" | "blog_activity" | "goal_milestone";
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
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      index: true // ✅ Indexed for faster lookups
    },
    sender: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      default: null, // Optional, only needed for friend requests/messages
    },
    message: { 
      type: String, 
      required: true, 
      trim: true,  // ✅ Prevents storing blank messages
      maxlength: [500, "Message cannot exceed 500 characters."] // Enforce message length
    },
    type: {
      type: String,
      enum: ["friend_request", "message", "group_invite", "blog_activity", "goal_milestone"],
      required: true, // ✅ Enforce explicit event type
    },
    read: { type: Boolean, default: false },
    link: { type: String, trim: true },
    expiresAt: { 
      type: Date, 
      index: { expires: "30d" } // ✅ Automatically delete notifications after 30 days
    },
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
