// src/api/services/NotificationService.ts
import Notification, { INotification } from "../models/Notification";
import { Types } from "mongoose";
import { createError } from "../middleware/errorHandler";

interface SendArgs {
  senderId: string;
  receiverId: string;
  message: string;
  type?: string;
  link?: string;
}

interface ListResult {
  notifications: INotification[];
  total: number;
}
interface ListOpts {
  page: number;
  limit: number;
}

class NotificationService {
  /** internal helper */
  private static async sendInApp(args: SendArgs): Promise<INotification> {
    const { senderId, receiverId, message, type = "info", link } = args;
    if (!Types.ObjectId.isValid(receiverId)) {
      throw createError("Invalid receiverId", 400);
    }
    return Notification.create({
      sender: senderId,
      user: receiverId,
      message,
      type,
      link,
      read: false,
      createdAt: new Date(),
    });
  }

  /**
   * Alias so controllers calling `sendInAppNotification` work without change.
   */
  static async sendInAppNotification(
    senderId: string,
    receiverId: string,
    message: string,
    type: string = "info",
    link?: string
  ): Promise<INotification> {
    return this.sendInApp({ senderId, receiverId, message, type, link });
  }

  /** list and paginate a user’s notifications */
  static async listForUser(
    userId: string,
    opts: ListOpts
  ): Promise<ListResult> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    const skip = (opts.page - 1) * opts.limit;
    const [notifications, total] = await Promise.all([
      Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(opts.limit)
        .lean()
        .exec(),
      Notification.countDocuments({ user: userId }),
    ]);
    return { notifications, total };
  }

  /** mark a set of notifications read for a user */
  static async markRead(userId: string, ids: string[]): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    const objectIds = ids
      .filter(Types.ObjectId.isValid)
      .map((id) => new Types.ObjectId(id));
    const res = await Notification.updateMany(
      { user: userId, _id: { $in: objectIds }, read: false },
      { read: true }
    );
    return res.modifiedCount;
  }

  /** delete a single notification if it belongs to the user */
  static async remove(userId: string, notifId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(notifId)) {
      throw createError("Invalid ID", 400);
    }
    const existing = await Notification.findOne({
      _id: notifId,
      user: userId,
    });
    if (!existing) {
      throw createError("Notification not found or access denied", 404);
    }
    await existing.deleteOne();
  }
}

export default NotificationService;
