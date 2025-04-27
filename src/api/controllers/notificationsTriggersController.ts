// src/controllers/notificationTriggerController.ts
import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { logger } from "../../utils/winstonLogger";
import Notification from "../models/Notification";
import { User } from "../models/User";
import sendEmail from "../utils/sendEmail"; // your nodemailer wrapper

/**
 * POST /api/notifications/daily-streak-reminder
 */
export const dailyStreakReminder = catchAsync(
  async (req: Request<{}, {}, { userId: string }>, res: Response) => {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }
    const msg = `Reminder: Keep your streak alive! You're at ${user.streak} days!`;
    await Notification.create({ user: userId, message: msg, type: "info", read: false });
    await sendEmail({
      to: user.email,
      subject: "Streak Reminder",
      text: msg,
    });
    logger.info(`Sent streak reminder to ${userId}`);
    sendResponse(res, 200, true, "Streak reminder sent");
  }
);

/**
 * POST /api/notifications/level-up
 */
export const levelUpNotification = catchAsync(
  async (req: Request<{}, {}, { userId: string; level: number }>, res: Response) => {
    const { userId, level } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }
    const msg = `Congratulations! You've leveled up to level ${level}!`;
    await Notification.create({ user: userId, message: msg, type: "success", read: false });
    logger.info(`Sent level-up to ${userId} (level ${level})`);
    sendResponse(res, 200, true, `Level-up notification sent for level ${level}`);
  }
);

/**
 * POST /api/notifications/badge-unlock
 */
export const badgeUnlockNotification = catchAsync(
  async (req: Request<{}, {}, { userId: string; badgeName: string }>, res: Response) => {
    const { userId, badgeName } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found");
      return;
    }
    const msg = `You unlocked the "${badgeName}" badge!`;
    await Notification.create({ user: userId, message: msg, type: "success", read: false });
    logger.info(`Sent badge-unlock to ${userId}: ${badgeName}`);
    sendResponse(res, 200, true, `Badge-unlock notification sent for ${badgeName}`);
  }
);

/**
 * POST /api/notifications/email
 */
export const customEmailNotification = catchAsync(
  async (
    req: Request<{}, {}, { email: string; subject: string; text: string }>,
    res: Response
  ): Promise<void> => {
    const { email, subject, text } = req.body;

    // sendEmail now takes a single EmailOptions object
    await sendEmail({
      to: email,
      subject,
      text,
    });

    logger.info(`Sent custom email to ${email}: ${subject}`);
    sendResponse(res, 200, true, "Email sent successfully");
  }
);
