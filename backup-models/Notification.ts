// src/api/models/Notification.ts
import type { Document, Model, Types, UpdateWriteOpResult } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Notification Types ---
export type NotificationType =
  | "friend_request"
  | "message"
  | "group_invite"
  | "blog_activity"
  | "goal_milestone";

// --- Interface for Notification Document ---
export interface INotification extends Document {
  user: Types.ObjectId;          // Receiver of the notification
  sender?: Types.ObjectId;       // Optional sender
  message: string;               // Notification message
  type: NotificationType;        // Notification category
  read: boolean;                 // Read status
  link?: string;                 // Optional link
  expiresAt?: Date;              // When notification expires
  createdAt: Date;               // Auto-generated
  updatedAt: Date;               // Auto-generated

  // Virtuals
  isExpired: boolean;

  // Instance methods
  markRead(): Promise<INotification>;
  markUnread(): Promise<INotification>;
}

// --- Model Interface for Statics ---
export interface INotificationModel extends Model<INotification> {
  findByUser(userId: Types.ObjectId, unreadOnly?: boolean): Promise<INotification[]>;
  markAllRead(userId: Types.ObjectId): Promise<UpdateWriteOpResult>;
  createNotification(data: {
    user: Types.ObjectId;
    sender?: Types.ObjectId;
    message: string;
    type: NotificationType;
    link?: string;
    expiresAt?: Date;
  }): Promise<INotification>;
}

// --- Schema Definition ---
const NotificationSchema = new Schema<INotification, INotificationModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [500, "Message cannot exceed 500 characters."],
    },
    type: {
      type: String,
      enum: [
        "friend_request",
        "message",
        "group_invite",
        "blog_activity",
        "goal_milestone",
      ],
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      expires: "30d", // auto-remove after 30 days
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Indexes ---
NotificationSchema.index({ user: 1 });
NotificationSchema.index({ sender: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ read: 1 });
NotificationSchema.index({ expiresAt: 1 });

// --- Virtuals ---
NotificationSchema.virtual("isExpired").get(function (this: INotification): boolean {
  return Boolean(this.expiresAt && Date.now() > this.expiresAt.getTime());
});

// --- Instance Methods ---
NotificationSchema.methods.markRead = async function (
  this: INotification
): Promise<INotification> {
  this.read = true;
  await this.save();
  return this;
};

NotificationSchema.methods.markUnread = async function (
  this: INotification
): Promise<INotification> {
  this.read = false;
  await this.save();
  return this;
};

// --- Static Methods ---
NotificationSchema.statics.findByUser = function (
  this: INotificationModel,
  userId: Types.ObjectId,
  unreadOnly = false
): Promise<INotification[]> {
  const filter: any = { user: userId };
  if (unreadOnly) filter.read = false;
  return this.find(filter)
    .sort({ createdAt: -1 })
    .limit(100);
};

NotificationSchema.statics.markAllRead = function (
  this: INotificationModel,
  userId: Types.ObjectId
): Promise<UpdateWriteOpResult> {
  return this.updateMany({ user: userId, read: false }, { $set: { read: true } });
};

NotificationSchema.statics.createNotification = function (
  this: INotificationModel,
  data: {
    user: Types.ObjectId;
    sender?: Types.ObjectId;
    message: string;
    type: NotificationType;
    link?: string;
    expiresAt?: Date;
  }
): Promise<INotification> {
  return this.create(data);
};

// --- Model Export ---
export const Notification = mongoose.model<INotification, INotificationModel>(
  "Notification",
  NotificationSchema
);

export default Notification;
