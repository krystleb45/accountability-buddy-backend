import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import NotificationService from "../services/NotificationService";
import { User } from "../models/User";

/**
 * @swagger
 * /api/notifications/daily-streak-reminder:
 *   post:
 *     summary: Send a daily reminder to maintain streak
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: User ID to send the streak reminder to
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Daily streak reminder sent successfully
 *       500:
 *         description: Failed to send reminder
 */
export const sendDailyStreakReminderHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body;
    await sendDailyStreakReminder(userId);
    sendResponse(res, 200, true, "Daily streak reminder sent successfully");
  }
);

// Internal logic for reusability (no Swagger needed here)
export const sendDailyStreakReminder = async (userId: string): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found.");

    const message = `Reminder: Keep your streak alive! You're at ${user.streak} days!`;
    await NotificationService.sendInAppNotification(userId, message);
    await NotificationService.sendEmail(user.email, "Streak Reminder", message);
  } catch (error) {
    console.error("Error sending daily streak reminder:", error);
  }
};

/**
 * @swagger
 * /api/notifications/level-up:
 *   post:
 *     summary: Send a level-up notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: User ID and new level
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - level
 *             properties:
 *               userId:
 *                 type: string
 *               level:
 *                 type: number
 *     responses:
 *       200:
 *         description: Level-up notification sent successfully
 *       500:
 *         description: Failed to send notification
 */
export const sendLevelUpNotification = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userId, level } = req.body;

  try {
    const message = `Congratulations! You've leveled up to level ${level}! Keep going!`;
    await NotificationService.sendInAppNotification(userId, message);
    sendResponse(res, 200, true, `Level-up notification sent successfully for level ${level}`);
  } catch (error) {
    console.error("Error sending level-up notification:", error);
    sendResponse(res, 500, false, "Failed to send level-up notification");
  }
});

/**
 * @swagger
 * /api/notifications/badge-unlock:
 *   post:
 *     summary: Send a badge unlock notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: User ID and badge name
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - badgeName
 *             properties:
 *               userId:
 *                 type: string
 *               badgeName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Badge unlock notification sent
 *       500:
 *         description: Failed to send notification
 */
export const sendBadgeUnlockNotification = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userId, badgeName } = req.body;

  try {
    const message = `Congrats! You've unlocked the "${badgeName}" badge! Keep up the great work!`;
    await NotificationService.sendInAppNotification(userId, message);
    sendResponse(res, 200, true, `Badge unlock notification sent for ${badgeName}`);
  } catch (error) {
    console.error("Error sending badge unlock notification:", error);
    sendResponse(res, 500, false, "Failed to send badge unlock notification");
  }
});

/**
 * @swagger
 * /api/notifications/email:
 *   post:
 *     summary: Send a custom email notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Email details
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - subject
 *               - text
 *             properties:
 *               email:
 *                 type: string
 *               subject:
 *                 type: string
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email notification sent successfully
 *       500:
 *         description: Failed to send email
 */
export const sendEmailNotification = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { email, subject, text } = req.body;

  try {
    await NotificationService.sendEmail(email, subject, text);
    sendResponse(res, 200, true, "Email notification sent successfully");
  } catch (error) {
    console.error("Error sending email notification:", error);
    sendResponse(res, 500, false, "Failed to send email notification");
  }
});

export default {
  sendDailyStreakReminder,
  sendLevelUpNotification,
  sendBadgeUnlockNotification,
  sendEmailNotification,
};
