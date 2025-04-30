// src/api/services/PartnerService.ts
import { Types } from "mongoose";
import Notification from "../models/Notification";
import { createError } from "../middleware/errorHandler";
import { logger } from "../../utils/winstonLogger";

class PartnerService {
  /**
   * Send a “milestone reached” notification to a partner.
   */
  static async notifyPartner(
    senderId: string,
    partnerId: string,
    goal: string,
    milestone: string
  ): Promise<void> {
    if (
      !Types.ObjectId.isValid(senderId) ||
      !Types.ObjectId.isValid(partnerId)
    ) {
      throw createError("Invalid user or partner ID", 400);
    }
    if (!goal.trim() || !milestone.trim()) {
      throw createError("Goal and milestone are required", 400);
    }

    await Notification.create({
      sender: senderId,
      user: partnerId,
      message: `Your partner (User ${senderId}) progressed on milestone "${milestone}" of goal "${goal}".`,
      type: "partner-notification",
      read: false,
    });

    logger.info(
      `Partner notification sent from ${senderId} to ${partnerId} about goal "${goal}" milestone "${milestone}"`
    );
  }

  /**
   * Send the “we’ve added you” notification.
   */
  static async addPartner(
    senderId: string,
    partnerId: string
  ): Promise<void> {
    if (
      !Types.ObjectId.isValid(senderId) ||
      !Types.ObjectId.isValid(partnerId)
    ) {
      throw createError("Invalid user or partner ID", 400);
    }

    await Notification.create({
      sender: senderId,
      user: partnerId,
      message: `User ${senderId} has added you as a partner.`,
      type: "partner-notification",
      read: false,
    });

    logger.info(`Partner add notification sent from ${senderId} to ${partnerId}`);
  }

  /**
   * List partner-type notifications for a user, paginated.
   */
  static async listNotifications(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<{
    notifications: Awaited<ReturnType<typeof Notification.find>>;
    total: number;
  }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ user: userId, type: "partner-notification" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ user: userId, type: "partner-notification" }),
    ]);

    return { notifications, total };
  }
}

export default PartnerService;
