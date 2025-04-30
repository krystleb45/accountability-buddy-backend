// src/api/services/NotificationTriggerService.ts
import { Types } from "mongoose";
import Notification from "../models/Notification";
import { User } from "../models/User";
import sendEmail from "../utils/sendEmail";
import { logger } from "../../utils/winstonLogger";
import { createError } from "../middleware/errorHandler";

class NotificationTriggerService {
  /**
   * Send a daily streak reminder to a user:
   *  - creates an in-app notification
   *  - emails the user
   */
  static async dailyStreakReminder(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    const user = await User.findById(userId).select("email streak");
    if (!user) {
      throw createError("User not found", 404);
    }

    const msg = `Reminder: Keep your streak alive! You're at ${user.streak} days!`;

    await Notification.create({
      user: userId,
      message: msg,
      type: "info",
      read: false,
    });

    await sendEmail({
      to: user.email,
      subject: "Streak Reminder",
      text: msg,
    });

    logger.info(`Sent daily streak reminder to user ${userId}`);
  }

  /**
   * Send a “level up” notification (in-app only).
   */
  static async levelUpNotification(userId: string, level: number): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    const user = await User.findById(userId);
    if (!user) {
      throw createError("User not found", 404);
    }

    const msg = `Congratulations! You've leveled up to level ${level}!`;

    await Notification.create({
      user: userId,
      message: msg,
      type: "success",
      read: false,
    });

    logger.info(`Sent level-up notification to user ${userId} (level ${level})`);
  }

  /**
   * Send a badge-unlocked notification (in-app only).
   */
  static async badgeUnlockNotification(userId: string, badgeName: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw createError("Invalid user ID", 400);
    }
    const user = await User.findById(userId);
    if (!user) {
      throw createError("User not found", 404);
    }

    const msg = `You unlocked the "${badgeName}" badge!`;

    await Notification.create({
      user: userId,
      message: msg,
      type: "success",
      read: false,
    });

    logger.info(`Sent badge-unlock notification to user ${userId} for "${badgeName}"`);
  }

  /**
   * Send a custom email notification (no in-app notification).
   */
  static async customEmailNotification(
    email: string,
    subject: string,
    text: string
  ): Promise<void> {
    if (!email.trim() || !subject.trim() || !text.trim()) {
      throw createError("Email, subject and text are all required", 400);
    }

    await sendEmail({ to: email, subject, text });
    logger.info(`Sent custom email to ${email}: "${subject}"`);
  }
}

export default NotificationTriggerService;
