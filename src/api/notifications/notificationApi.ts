import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import NotificationService from "../services/NotificationService";  // Import notification service to send notifications
import { User } from "../models/User";

/**
 * @desc Send a daily reminder to keep the streak alive
 * @route POST /api/notifications/daily-streak-reminder
 * @access Private (User must be authenticated)
 */
// Send daily reminder for streaks (reusable in both cron job and route handler)
export const sendDailyStreakReminder = async (userId: string): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }
  
    // Assuming the notification is sent through email or in-app notifications
    // Example: sending an email reminder
    const message = `Reminder: Keep your streak alive! You're at ${user.streak} days!`;
  
    // In-app notification
    await NotificationService.sendInAppNotification(userId, message);
  
    // Email reminder (optional)
    await NotificationService.sendEmail(user.email, "Streak Reminder", message);
  
    // Optionally, handle push notifications, SMS, etc. depending on your system setup
  } catch (error) {
    console.error("Error sending daily streak reminder:", error);
  }
};
  
// Original route handler
export const sendDailyStreakReminderHandler = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body; // Extract userId from the request body
  
    await sendDailyStreakReminder(userId); // Use the refactored function
  
    sendResponse(res, 200, true, "Daily streak reminder sent successfully");
  }
);
  

/**
 * @desc Send a level-up notification
 * @route POST /api/notifications/level-up
 * @access Private (User must be authenticated)
 */
export const sendLevelUpNotification = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userId, level } = req.body;

  // Send level-up notification
  try {
    const message = `Congratulations! You've leveled up to level ${level}! Keep going!`;
    await NotificationService.sendInAppNotification(userId, message);
    sendResponse(res, 200, true, `Level-up notification sent successfully for level ${level}`);
  } catch (error) {
    console.error("Error sending level-up notification:", error); // Log the error
    sendResponse(res, 500, false, "Failed to send level-up notification");
  }
});

/**
 * @desc Send a badge unlock notification
 * @route POST /api/notifications/badge-unlock
 * @access Private (User must be authenticated)
 */
export const sendBadgeUnlockNotification = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userId, badgeName } = req.body;

  // Send badge unlock notification
  try {
    const message = `Congrats! You've unlocked the "${badgeName}" badge! Keep up the great work!`;
    await NotificationService.sendInAppNotification(userId, message);
    sendResponse(res, 200, true, `Badge unlock notification sent for ${badgeName}`);
  } catch (error) {
    console.error("Error sending badge unlock notification:", error); // Log the error
    sendResponse(res, 500, false, "Failed to send badge unlock notification");
  }
});

/**
 * @desc Send an email notification
 * @route POST /api/notifications/email
 * @access Private
 */
export const sendEmailNotification = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { email, subject, text } = req.body;

  try {
    await NotificationService.sendEmail(email, subject, text);
    sendResponse(res, 200, true, "Email notification sent successfully");
  } catch (error) {
    console.error("Error sending email notification:", error); // Log the error
    sendResponse(res, 500, false, "Failed to send email notification");
  }
});

export default {
  sendDailyStreakReminder,
  sendLevelUpNotification,
  sendBadgeUnlockNotification,
  sendEmailNotification,
};
