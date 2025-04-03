import nodemailer from "nodemailer";
import Notification from "../models/Notification";
import LoggingService from "./LoggingService";
// import client from "../config/twilioConfig"; // Uncomment if Twilio is being used
import firebaseAdmin from "../../config/firebaseConfig"; // Firebase Admin SDK for push notifications
import { User } from "../models/User";

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

  // ** New Responsibilities - Subscription-Related Notifications **

  // Notify user when their trial is about to expire (e.g., 3 days before expiration)
  sendTrialExpirationAlert: async (userId: string): Promise<void> => {
    const message = "Your trial period is about to expire. Upgrade now to continue using premium features.";
    await NotificationService.sendInAppNotification(userId, message);
    const user = await User.findById(userId);

    if (user?.email) {
      await NotificationService.sendEmail(user.email, "Trial Expiration Alert", message);
    }
  },

  // Notify user when their subscription is about to expire
  sendSubscriptionExpirationAlert: async (userId: string): Promise<void> => {
    const message = "Your subscription is about to expire. Renew now to continue enjoying premium features.";
    await NotificationService.sendInAppNotification(userId, message);
    const user = await User.findById(userId);

    if (user?.email) {
      await NotificationService.sendEmail(user.email, "Subscription Expiration Alert", message);
    }
  },

  // Notify user when their subscription has been canceled
  sendSubscriptionCanceledAlert: async (userId: string): Promise<void> => {
    const message = "Your subscription has been canceled. Please contact support if you need assistance.";
    await NotificationService.sendInAppNotification(userId, message);
    const user = await User.findById(userId);

    if (user?.email) {
      await NotificationService.sendEmail(user.email, "Subscription Canceled", message);
    }
  },

  // Send upgrade prompt when trial ends
  sendUpgradePrompt: async (userId: string): Promise<void> => {
    const message = "Your trial has ended. Upgrade to a paid subscription to continue enjoying premium features.";
    await NotificationService.sendInAppNotification(userId, message);
    const user = await User.findById(userId);

    if (user?.email) {
      await NotificationService.sendEmail(user.email, "Trial Ended - Upgrade Now", message);
    }
  },

  // Other methods...
};

export default NotificationService;
