import nodemailer from "nodemailer";
import Notification from "../models/Notification";
import LoggingService from "./LoggingService";
// import client from "../config/twilioConfig"; // Uncomment if Twilio is being used
import firebaseAdmin from "../../config/firebaseConfig"; // Firebase Admin SDK for push notifications
import Group from "../models/Group"; // Import Group model
import mongoose from "mongoose";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT === "465", // Use SSL if port is 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface EmailOptions {
  from?: string;
  cc?: string;
  bcc?: string;
  attachments?: Array<{ filename: string; path: string }>;
  html?: string;
}

const NotificationService = {
  // Send Email Notification
  sendEmail: async (
    to: string,
    subject: string,
    text: string,
    options: EmailOptions = {}
  ): Promise<void> => {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      ...options,
    };

    try {
      await transporter.sendMail(mailOptions);
      LoggingService.logInfo(`Email sent to ${to} with subject: ${subject}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error sending email notification",
        new Error(errorMessage),
        { to, subject }
      );
      throw new Error("Failed to send email notification");
    }
  },

  // Send In-App Notification
  sendInAppNotification: async (
    userId: string,
    message: string
  ): Promise<void> => {
    try {
      const notification = new Notification({
        userId,
        message,
        date: new Date(),
        read: false,
      });
      await notification.save();
      LoggingService.logInfo(`In-app notification sent to user: ${userId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error sending in-app notification",
        new Error(errorMessage),
        { userId, message }
      );
      throw new Error("Failed to send in-app notification");
    }
  },

  // Send Push Notification using Firebase Admin SDK
  sendPushNotification: async (
    deviceToken: string,
    message: string
  ): Promise<void> => {
    try {
      const payload = {
        notification: {
          title: "New Notification",
          body: message,
        },
      };
      const response = await firebaseAdmin
        .messaging()
        .send({ token: deviceToken, ...payload });
      LoggingService.logInfo(
        `Push notification sent to device token: ${deviceToken} with response: ${response}`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error sending push notification",
        new Error(errorMessage),
        { deviceToken, message }
      );
      throw new Error("Failed to send push notification");
    }
  },

  // Mark Notification as Read
  markNotificationAsRead: async (
    notificationId: string,
    userId: string
  ): Promise<void> => {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        userId,
      });

      if (!notification) {
        throw new Error("Notification not found.");
      }

      notification.read = true;
      await notification.save();

      LoggingService.logInfo(
        `Notification with ID ${notificationId} marked as read by user ${userId}`
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error marking notification as read",
        new Error(errorMessage),
        { notificationId, userId }
      );
      throw new Error("Failed to mark notification as read");
    }
  },

  // Send Poll Created Notification
  sendPollCreatedNotification: async (
    groupId: mongoose.Types.ObjectId,
    pollId: mongoose.Types.ObjectId
  ): Promise<void> => {
    try {
      const group = await Group.findById(groupId);
      if (!group || !Array.isArray(group.members)) {
        throw new Error("Group or group members not found");
      }

      const members = group.members; // TypeScript now knows this is an array
      const message = "A new poll has been created in the group. Check it out now!";

      for (const memberId of members) {
        if (memberId instanceof mongoose.Types.ObjectId) {
          await NotificationService.sendInAppNotification(
            memberId.toString(),
            message
          );
        }
      }

      LoggingService.logInfo(`Poll created notification sent for poll ${pollId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error sending poll created notification",
        new Error(errorMessage),
        { groupId, pollId }
      );
      throw new Error("Failed to send poll created notification");
    }
  },

  // Send Poll Results Ready Notification
  sendPollResultsReadyNotification: async (
    groupId: mongoose.Types.ObjectId,
    pollId: mongoose.Types.ObjectId
  ): Promise<void> => {
    try {
      const group = await Group.findById(groupId);
      if (!group || !Array.isArray(group.members)) {
        throw new Error("Group or group members not found");
      }

      const members = group.members; // TypeScript now knows this is an array
      const message = "The results for the poll are now available!";

      for (const memberId of members) {
        if (memberId instanceof mongoose.Types.ObjectId) {
          await NotificationService.sendInAppNotification(
            memberId.toString(),
            message
          );
        }
      }

      LoggingService.logInfo(`Poll results ready notification sent for poll ${pollId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error sending poll results notification",
        new Error(errorMessage),
        { groupId, pollId }
      );
      throw new Error("Failed to send poll results notification");
    }
  },

  // Add Unread Messages for Group Members
  addUnreadMessage: async (
    userId: string, // userId is a string, but will be converted to ObjectId
    groupId: mongoose.Types.ObjectId
  ): Promise<void> => {
    try {
      const group = await Group.findById(groupId);

      if (!group) {
        throw new Error("Group not found");
      }

      // Convert userId to ObjectId
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Find the unread message count for this user
      const userUnread = group.unreadMessages.find(
        (entry) => entry.userId.equals(userObjectId) // Compare using ObjectId
      );

      if (userUnread) {
        userUnread.count += 1; // Increment unread count for the user
      } else {
        group.unreadMessages.push({ userId: userObjectId, count: 1 }); // Add new unread entry
      }

      await group.save();
      LoggingService.logInfo(`Unread message count updated for user ${userId} in group ${groupId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error adding unread message count",
        new Error(errorMessage),
        { userId, groupId }
      );
      throw new Error("Failed to add unread message count");
    }
  },

  // Update Unread Messages
  updateUnreadMessageCount: async (
    userId: string, // userId is a string, but will be converted to ObjectId
    groupId: mongoose.Types.ObjectId,
    unreadCount: number
  ): Promise<void> => {
    try {
      const group = await Group.findById(groupId);

      if (!group) {
        throw new Error("Group not found");
      }

      // Convert userId to ObjectId
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Find the index of the user in the unreadMessages array
      const memberIndex = group.unreadMessages.findIndex((entry) =>
        entry.userId.equals(userObjectId)
      );

      if (memberIndex !== -1) {
        // Update unread count for the existing user
        group.unreadMessages[memberIndex].count = unreadCount;
      } else {
        // Add new unread message entry if not found
        group.unreadMessages.push({ userId: userObjectId, count: unreadCount });
      }

      await group.save();
      LoggingService.logInfo(`Unread message count updated for user ${userId} in group ${groupId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      LoggingService.logError(
        "Error updating unread message count",
        new Error(errorMessage),
        { userId, groupId }
      );
      throw new Error("Failed to update unread message count");
    }
  },
};

export default NotificationService;
